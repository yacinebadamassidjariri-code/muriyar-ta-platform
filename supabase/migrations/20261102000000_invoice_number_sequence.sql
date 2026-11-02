-- Fix invoice number concurrency: wrap the sequence scan in a transaction-level
-- advisory lock so concurrent inserts wait rather than racing to the same number.
--
-- The unique constraint on commercial_invoices.invoice_number still catches any
-- edge case, but this prevents the surface-level conflict error users would see.
--
-- NOT yet applied to production. Run only after the pre-deployment checklist in
-- MIGRATIONS.md has been completed.

begin;

create or replace function public.create_invoice(
  p_org_id       uuid,
  p_contract_id  uuid,
  p_title        text,
  p_issue_date   date,
  p_due_date     date,
  p_amount_usd   numeric,
  p_currency     text    default 'USD',
  p_notes        text    default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year       text;
  v_seq        int;
  v_number     text;
  v_invoice_id uuid;
  v_uid        uuid;
begin
  -- Require MFA (AAL2) for all invoice creation.
  perform public.require_aal2();

  -- Permission check.
  if not public.has_permission('commercial.edit') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  -- Validate org exists.
  if not exists (
    select 1 from public.institutional_organizations
    where org_id = p_org_id
  ) then
    raise exception 'org_not_found' using errcode = 'P0002';
  end if;

  v_year := to_char(coalesce(p_issue_date, current_date), 'YYYY');

  -- -----------------------------------------------------------------------
  -- Acquire a transaction-level advisory lock keyed to the invoice-sequence
  -- namespace for this year. The lock is released automatically at COMMIT
  -- or ROLLBACK, ensuring exactly one connection at a time can advance the
  -- sequence counter.  hashtext() produces a stable int4 from the string;
  -- we use a fixed namespace int (20261102) to avoid colliding with other
  -- advisory locks in this project.
  -- -----------------------------------------------------------------------
  perform pg_advisory_xact_lock(20261102, hashtext('invoice_seq_' || v_year));

  -- Sequential invoice number within the year (MT-YYYY-NNN).
  select coalesce(max(
    nullif(regexp_replace(invoice_number, '^MT-' || v_year || '-0*', ''), '')::int
  ), 0) + 1
  into v_seq
  from public.commercial_invoices
  where invoice_number like 'MT-' || v_year || '-%';

  v_number := 'MT-' || v_year || '-' || lpad(v_seq::text, 3, '0');

  v_uid := auth.uid();

  insert into public.commercial_invoices(
    org_id, contract_id, invoice_number, title,
    issue_date, due_date, amount_usd, currency,
    status, internal_notes, created_by, updated_by
  ) values (
    p_org_id, p_contract_id, v_number, p_title,
    coalesce(p_issue_date, current_date),
    p_due_date,
    p_amount_usd,
    coalesce(p_currency, 'USD'),
    'DRAFT',
    p_notes,
    v_uid,
    v_uid
  )
  returning invoice_id into v_invoice_id;

  perform audit.write_event(
    'invoice.created',
    jsonb_build_object(
      'invoice_id',     v_invoice_id,
      'invoice_number', v_number,
      'org_id',         p_org_id,
      'contract_id',    p_contract_id,
      'amount_usd',     p_amount_usd
    )
  );

  return v_invoice_id;
end;
$$;

-- Restore grants (replacing the function revokes existing grants).
revoke all on function public.create_invoice(uuid, uuid, text, date, date, numeric, text, text)
  from public, anon, authenticated;
grant execute on function public.create_invoice(uuid, uuid, text, date, date, numeric, text, text)
  to authenticated;

commit;
