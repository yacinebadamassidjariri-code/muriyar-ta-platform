-- Phase 3B hardening — Financial integrity.
--
-- Changes:
--   1. Fixes record_invoice_payment() to check for overpayment inside the
--      transaction, BEFORE inserting the payment row.  The FOR UPDATE lock
--      on the invoice row already serialises concurrent attempts; the
--      explicit balance check now makes overpayment impossible even when
--      two sessions race to record the final instalment.
--
--   2. Fixes the audit.write_event() call in create_invoice() that was
--      introduced by migration 20261102.  That migration used a 2-argument
--      form; the correct canonical form is 4 arguments
--      (event_name, object_type, object_id::text, payload).
--
-- NOT YET APPLIED TO PRODUCTION.  Apply only after staging rehearsal.

begin;

-- ============================================================================
-- 1. record_invoice_payment — add overpayment guard
-- ============================================================================
-- Strategy:
--   a. Lock the invoice row (FOR UPDATE — prevents concurrent inserts from
--      reading a stale balance before our transaction commits).
--   b. Sum payments already recorded for this invoice inside the same
--      transaction so we see uncommitted sibling payments in READ COMMITTED
--      via the lock.
--   c. Raise 'overpayment' (SQLSTATE 22023) if the new amount would exceed
--      the outstanding balance.
--
-- The server action (recordPaymentAction) already checks
-- error.message.includes("overpayment") — this makes that check work.

create or replace function public.record_invoice_payment(
  p_invoice_id  uuid,
  p_payment_date date,
  p_amount_usd   numeric,
  p_currency     text    default 'USD',
  p_reference    text    default null,
  p_notes        text    default null
)
returns uuid
language plpgsql
security definer
set search_path = public, audit
as $$
declare
  v_payment_id  uuid;
  v_invoice     public.commercial_invoices%rowtype;
  v_paid_already numeric;
  v_balance      numeric;
  v_paid_total   numeric;
begin
  perform public.require_aal2();
  if not public.has_permission('commercial.edit') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_amount_usd is null or p_amount_usd <= 0 then
    raise exception 'amount_must_be_positive' using errcode = '22023';
  end if;

  -- Lock the invoice row first so concurrent transactions queue behind us.
  select * into v_invoice
  from public.commercial_invoices
  where invoice_id = p_invoice_id for update;

  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if v_invoice.status = 'CANCELLED' then
    raise exception 'invoice_cancelled' using errcode = '22023';
  end if;
  if v_invoice.status = 'PAID' then
    raise exception 'invoice_already_paid' using errcode = '22023';
  end if;

  -- Calculate the current total already paid (after we hold the lock).
  select coalesce(sum(amount_usd), 0) into v_paid_already
  from public.invoice_payments
  where invoice_id = p_invoice_id;

  v_balance := v_invoice.amount_usd - v_paid_already;

  if p_amount_usd > v_balance then
    raise exception 'overpayment: payment of % USD would exceed outstanding balance of % USD',
      p_amount_usd, v_balance
      using errcode = '22023';
  end if;

  -- Insert the payment row.
  insert into public.invoice_payments(
    invoice_id, payment_date, amount_usd, currency,
    payment_reference, notes, recorded_by
  ) values (
    p_invoice_id, p_payment_date, p_amount_usd,
    coalesce(p_currency, 'USD'), p_reference, p_notes, auth.uid()
  ) returning payment_id into v_payment_id;

  -- Recalculate running total and update invoice status atomically.
  v_paid_total := v_paid_already + p_amount_usd;

  update public.commercial_invoices
  set status = case
        when v_paid_total >= amount_usd then 'PAID'
        when v_paid_total > 0           then 'PARTIALLY_PAID'
        else status
      end,
      updated_at = now()
  where invoice_id = p_invoice_id;

  perform audit.write_event(
    'commercial.invoice.payment_recorded',
    'commercial_invoice',
    p_invoice_id::text,
    jsonb_build_object(
      'payment_id',    v_payment_id,
      'amount_usd',    p_amount_usd,
      'balance_before', v_balance,
      'paid_total',    v_paid_total
    )
  );

  return v_payment_id;
end;
$$;

-- Preserve existing grants.
revoke all on function public.record_invoice_payment(uuid, date, numeric, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_invoice_payment(uuid, date, numeric, text, text, text)
  to authenticated;

-- ============================================================================
-- 2. create_invoice — fix audit.write_event() call (was 2-arg, must be 4-arg)
--
--    Migration 20261102 patched create_invoice() to add an advisory lock but
--    introduced a bug: it called audit.write_event with only 2 arguments.
--    The correct signature is (event_name, object_type, object_id, payload).
--    This migration replaces the function again with the correct call.
--
--    The advisory-lock logic from 20261102 is preserved verbatim.
-- ============================================================================

create or replace function public.create_invoice(
  p_org_id        uuid,
  p_contract_id   uuid    default null,
  p_title         text    default null,
  p_issue_date    date    default current_date,
  p_due_date      date    default null,
  p_amount_usd    numeric default 0,
  p_currency      text    default 'USD',
  p_internal_notes text   default null
)
returns uuid
language plpgsql
security definer
set search_path = public, audit
as $$
declare
  v_invoice_id uuid;
  v_number     text;
  v_year       int  := extract(year from coalesce(p_issue_date, current_date));
  v_seq        int;
begin
  perform public.require_aal2();
  if not public.has_permission('commercial.edit') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_amount_usd < 0 then
    raise exception 'amount_cannot_be_negative' using errcode = '22023';
  end if;

  -- Advisory lock: serialize invoice number generation for the same year.
  -- hashtext produces a 32-bit int from the key string; the first arg (20261102)
  -- is the application-level namespace so this lock cannot collide with others.
  perform pg_advisory_xact_lock(20261102, hashtext('invoice_seq_' || v_year));

  -- Derive next sequence number for this year.
  select coalesce(max(
    (regexp_match(invoice_number, '-(\d+)$'))[1]::int
  ), 0) + 1
  into v_seq
  from public.commercial_invoices
  where invoice_number like 'INV-' || v_year || '-%';

  v_number := 'INV-' || v_year || '-' || lpad(v_seq::text, 4, '0');

  insert into public.commercial_invoices(
    org_id, contract_id, invoice_number, title,
    issue_date, due_date, amount_usd, currency,
    internal_notes, status, created_by
  ) values (
    p_org_id, p_contract_id, v_number,
    coalesce(p_title, v_number),
    coalesce(p_issue_date, current_date), p_due_date,
    coalesce(p_amount_usd, 0), coalesce(p_currency, 'USD'),
    p_internal_notes, 'ISSUED', auth.uid()
  ) returning invoice_id into v_invoice_id;

  -- Correct 4-argument audit call (fixes 20261102 which used 2 arguments).
  perform audit.write_event(
    'commercial.invoice.created',
    'commercial_invoice',
    v_invoice_id::text,
    jsonb_build_object(
      'number',     v_number,
      'amount_usd', p_amount_usd,
      'org_id',     p_org_id
    )
  );

  return v_invoice_id;
end;
$$;

revoke all on function public.create_invoice(uuid, uuid, text, date, date, numeric, text, text)
  from public, anon, authenticated;
grant execute on function public.create_invoice(uuid, uuid, text, date, date, numeric, text, text)
  to authenticated;

commit;
