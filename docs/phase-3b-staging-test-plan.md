# Phase 3B Staging Test Plan

**Environment**: Disposable Supabase branch (never production)  
**Prerequisite**: All five migrations applied in order on the branch before testing begins  
**Constraint**: MFA (AAL2) is required for all write operations — tests marked [MFA] require a real TOTP session

---

## 0. Pre-flight: Migration Order Verification

Before running any functional tests, confirm migrations applied cleanly in sequence:

```sql
select version, name, executed_at
from supabase_migrations.schema_migrations
order by version;
```

Expected rows (in order):
- `20261101000000` — institutional_commercial_schema
- `20261102000000` — invoice_number_sequence
- `20261103000000` — brief_consent_gate
- `20261104000000` — financial_integrity
- `20261105000000` — mfa_rpc_hardening

If any row is missing or out of order, stop and re-apply.

---

## 1. Research Consent Enforcement (Migration 20261103)

### 1.1 Happy path: brief approved with all consent cleared

1. Create a real (non-sample) brief in DRAFT status.
2. Add an evidence link with:
   - `eligibility = 'ELIGIBLE'`
   - `human_review_completed = true`
   - `inclusion_decision = true`
   - `consent_active_at_review = true`
   - `research_consent_verified_at = now()`
   - `consent_withdrawn_at = NULL`
   - `reidentification_risk_flagged = false`
3. Transition brief to `IN_REVIEW` via `brief_transition(id, 'submit_review')`.
4. Call `brief_transition(id, 'approve')` — **must succeed**, return `'APPROVED'`.
5. Call `brief_transition(id, 'publish')` — **must succeed**, return `'PUBLISHED'`.

### 1.2 Negative: approve blocked by stale consent

1. Create brief + evidence link with `research_consent_verified_at = now() - interval '91 days'`.
2. Transition to IN_REVIEW.
3. Call `brief_transition(id, 'approve')`.
4. **Expected**: exception `consent_gate_failed` raised. Brief status remains `IN_REVIEW`.

### 1.3 Negative: approve blocked by withdrawn consent

1. Evidence link with `consent_withdrawn_at = now() - interval '1 day'`.
2. Call `brief_transition(id, 'approve')`.
3. **Expected**: exception `consent_gate_failed`.

### 1.4 Negative: approve blocked by ineligible evidence

1. Evidence link with `eligibility = 'EXCLUDED'`.
2. Call `brief_transition(id, 'approve')`.
3. **Expected**: exception `consent_gate_failed`.

### 1.5 Negative: approve blocked by re-identification risk

1. Evidence link with `reidentification_risk_flagged = true`.
2. Call `brief_transition(id, 'approve')`.
3. **Expected**: exception `consent_gate_failed`.

### 1.6 Happy path: sample brief is exempt

1. Create a brief with `is_sample = true`.
2. Attempt to add an evidence link to it via INSERT.
3. **Expected**: trigger fires, error `cannot_link_evidence_to_sample_brief` (SQLSTATE 23514).
4. (Sample brief has no evidence, so consent gate passes trivially.)
5. Transition through `submit_review` → `approve` → `publish` — **all must succeed**.

### 1.7 Consent withdrawal propagation

1. Evidence link is ELIGIBLE, brief is APPROVED.
2. Call `propagate_consent_withdrawal(submission_id)` (requires `insight.evidence.review` permission + AAL2).
3. **Expected**: link `eligibility` → `INELIGIBLE`, `consent_withdrawn_at` set, audit event recorded.
4. Attempt `brief_transition(brief_id, 'publish')`.
5. **Expected**: fails with `consent_gate_failed`.

### 1.8 `check_brief_consent_status()` JSON response

1. Call `check_brief_consent_status(brief_id)` with a mix of passing and failing links.
2. **Expected**: `cleared = false`, `blocked_links > 0`, `issues` array contains per-link breakdown.
3. Call with a fully-cleared brief.
4. **Expected**: `cleared = true`, `blocked_links = 0`.

---

## 2. Financial Integrity (Migration 20261104)

### 2.1 Happy path: normal payment

1. Create invoice for $1,000.
2. Call `record_invoice_payment(id, today, 500.00, 'USD', 'REF-001', null)` [MFA].
3. **Expected**: payment inserted, status → `PARTIALLY_PAID`, balance = $500.
4. Call again with $500.00.
5. **Expected**: status → `PAID`, balance = $0.

### 2.2 Negative: overpayment rejected

1. Invoice for $1,000 with $900 already paid (balance = $100).
2. Call `record_invoice_payment(id, today, 200.00, ...)`.
3. **Expected**: exception raised with message containing `'overpayment'`, SQLSTATE 22023.
4. Confirm no payment row was inserted; invoice status unchanged.

### 2.3 Negative: concurrent overpayment (race condition)

Run two concurrent sessions simultaneously:
- Session A: call `record_invoice_payment(id, today, 600.00)` — invoice balance = $1,000
- Session B: call `record_invoice_payment(id, today, 600.00)` — same invoice

**Expected**: one succeeds (status → PARTIALLY_PAID), the other raises `overpayment` or blocks until A commits then raises it. Total recorded must not exceed $1,000.

### 2.4 Negative: payment on cancelled invoice

1. Cancel an invoice (update status to CANCELLED directly via admin if no cancel RPC).
2. Call `record_invoice_payment(...)`.
3. **Expected**: exception `invoice_cancelled`.

### 2.5 Negative: payment on already-paid invoice

1. Invoice fully paid (status = PAID, balance = 0).
2. Attempt `record_invoice_payment(id, today, 0.01)`.
3. **Expected**: exception `invoice_already_paid`.

### 2.6 Invoice number sequence (advisory lock)

1. Create 10 invoices concurrently (10 parallel sessions, same year).
2. **Expected**: all 10 get unique sequential numbers (INV-2026-0001 through INV-2026-0010). No duplicates, no gaps.

### 2.7 Audit event correctness (4-argument call)

1. Create an invoice.
2. Query `audit.events` (or `audit.http_request_logs` — depends on audit schema):
   ```sql
   select * from audit.events
   where event_name = 'commercial.invoice.created'
   order by created_at desc limit 1;
   ```
3. **Expected**: row exists with `object_type = 'commercial_invoice'`, `object_id = <invoice_id>`, `payload` contains `number` and `amount_usd` fields.
4. **Negative verification**: confirm no row exists with a 2-argument call signature artifact (e.g., `object_type` is a JSON blob rather than a string).

---

## 3. MFA Enforcement (Migration 20261105)

### 3.1 Direct-write grants revoked [database-level check]

```sql
-- These must return no rows (no direct INSERT/UPDATE/DELETE for authenticated)
select grantee, privilege_type, table_name
from information_schema.role_table_grants
where table_name in (
  'service_packages','institutional_organizations',
  'commercial_opportunities','commercial_proposals','commercial_contracts'
)
and grantee = 'authenticated'
and privilege_type in ('INSERT','UPDATE','DELETE');
```

**Expected**: 0 rows.

### 3.2 AAL1 session cannot write via RPC [MFA]

1. Obtain an AAL1 JWT (password only, no MFA).
2. Call `save_organization(NULL, 'Test Org', ...)`.
3. **Expected**: exception with SQLSTATE 42501 (or message containing `forbidden`).

### 3.3 AAL2 session can write via RPC [MFA]

1. Complete MFA to obtain AAL2 JWT.
2. Call `save_organization(NULL, 'Test Org', 'NGO', 'Kenya', ...)`.
3. **Expected**: returns a UUID (new org_id). Row exists in `institutional_organizations`.

### 3.4 All 5 RPCs accept AAL2 [MFA]

Repeat 3.3 pattern for: `save_opportunity`, `save_proposal`, `save_contract`, `save_package`.

### 3.5 Server action routes through RPC (not direct write)

1. Exercise `saveOrganizationAction` via the admin UI form (requires AAL2 session in browser).
2. Check Supabase logs — no direct INSERT on `institutional_organizations` from `authenticated` role.
3. **Expected**: only RPC call visible in logs.

---

## 4. PDF Invoice Generation

### 4.1 Happy path: authenticated user downloads PDF view

1. Navigate to `/[locale]/admin/partnerships/invoices/[invoiceId]/pdf` in browser (AAL1 sufficient — read-only).
2. **Expected**: browser renders an HTML invoice page with:
   - Invoice number, organization name, issue date, due date visible
   - Invoice amount, total received, balance due visible
   - Payment history table (if payments exist)
   - "Save as PDF / Print" button visible
   - Status badge visible

### 4.2 Security: forbidden fields absent from rendered HTML

Inspect the raw HTML source of the PDF page. Confirm **none** of these appear anywhere in the HTML body:
- `internal_notes` content (field value)
- `est_labor_cost_usd` value
- `est_overhead_usd` value
- `est_staff_hours` value
- `contract_id` UUID
- Any submission or contributor text

### 4.3 Security: payment notes absent from PDF

If a payment has `notes` set (e.g. "internal payment note"), confirm the notes text **does not appear** in the rendered HTML. Only `payment_date`, `amount_usd`, and `reference` appear per payment row.

### 4.4 Negative: unauthenticated access blocked

1. Make a GET request to the PDF route without a session cookie.
2. **Expected**: 403 Forbidden (or redirect to login — depending on middleware).

### 4.5 Negative: wrong permission blocked

1. Log in as a user with only `insight.brief.read` (no `commercial.read`).
2. Navigate to PDF route.
3. **Expected**: 403 Forbidden.

### 4.6 PDF page print output

1. Open PDF route in browser.
2. Invoke print preview (Cmd/Ctrl+P).
3. **Expected**: "Save as PDF / Print" button hidden, layout fits A4 page, no clipped content.

### 4.7 Print link on invoice detail page

1. Navigate to `/admin/partnerships/invoices/[invoiceId]`.
2. **Expected**: "Print / Save as PDF" button visible in sidebar with printer icon.
3. Click it — should open the printable invoice view in a new tab at `/print`.
4. **Confirm**: browser tab address ends with `/print`, not `/pdf`.

---

## 5. RLS Verification

### 5.1 Anon user cannot read commercial tables

```sql
-- Run as anon role
set role anon;
select count(*) from public.institutional_organizations;  -- must fail or return 0
select count(*) from public.commercial_invoices;          -- must fail or return 0
select count(*) from public.brief_evidence_links;         -- must fail or return 0
```

**Expected**: 0 rows or permission denied for all three.

### 5.2 `commercial.read` can read, cannot write

1. Authenticate as a user with `commercial.read` but NOT `commercial.edit`.
2. `getInvoice()` — **should succeed**.
3. `createInvoiceAction()` — **must fail** with permission denied.

### 5.3 `insight.brief.edit` can submit for review but cannot publish

1. User with `insight.brief.edit` only (no `insight.brief.publish`).
2. `brief_transition(id, 'submit_review')` — **must succeed**.
3. `brief_transition(id, 'approve')` — **must fail** with `forbidden`.

---

## 6. Complete Workflow Tests

### 6.1 Full commercial lifecycle

1. Create organization [MFA]
2. Create opportunity [MFA]
3. Create proposal [MFA]
4. Create contract [MFA]
5. Create invoice against contract [MFA]
6. Record partial payment [MFA]
7. Record final payment [MFA]
8. Download invoice PDF — confirm PAID status shown, correct balance ($0.00)

### 6.2 Full brief lifecycle with consent

1. Create brief (DRAFT)
2. Add evidence link with all consent fields set (ELIGIBLE, reviewed, fresh)
3. Submit for review
4. Check consent status via `check_brief_consent_status()` → cleared: true
5. Approve [MFA, `insight.brief.publish`]
6. Withdraw consent for one submission via `propagate_consent_withdrawal()`
7. Attempt re-publish → **must fail** (consent_gate_failed)
8. **Verify withdrawal is permanent**: confirm that no staff action (clearing `consent_withdrawn_at`, setting `eligibility = 'ELIGIBLE'`, or updating `research_consent_verified_at`) can re-enable publication of this brief while the withdrawal record stands. **This is a security boundary — staff must not be able to override a contributor's withdrawal.**
9. To re-enable publication, the affected evidence link must be removed from the brief, OR the contributor must independently provide new valid research consent (a new `raw_submissions` record with `research_consent_given = true`). Neither path may be taken by staff alone.

> **Note on step 8**: the current implementation (migration 20261103) enforces withdrawal only through `brief_evidence_links.consent_withdrawn_at`, which is staff-editable metadata. A separate migration (20261106) is pending architectural approval to make withdrawals immutable via a `research_consent_withdrawals` table and to make the consent gate join directly to `raw_submissions`. Until that migration is applied, step 8 above is aspirational for the immutability guarantee. See the deployment readiness report section A15.

---

## Cleanup

After all tests pass on the branch:
- Delete the Supabase branch (disposable)
- Do not merge branch migrations to production without explicit approval
- Record results in the deployment readiness report

---

*Last updated: 2026-11-02. Not applied to production.*
