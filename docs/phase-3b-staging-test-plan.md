# Phase 3B Staging Test Plan

**Environment**: Disposable Supabase branch (never production)  
**Prerequisite**: All six migrations applied in order on the branch before testing begins  
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
- `20261106000000` — research_consent_withdrawals

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

1. Evidence link where the submission has a row in `research_consent_withdrawals`.
2. Call `brief_transition(id, 'approve')`.
3. **Expected**: exception `consent_gate_failed` — gate blocks on the ledger record, not on `brief_evidence_links.consent_withdrawn_at`.

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
2. Call `record_consent_withdrawal(submission_id, 'contributor_requested')` (requires `insight.evidence.review` permission + AAL2).
3. **Expected**:
   - Row inserted in `research_consent_withdrawals` for this submission.
   - Link `eligibility` → `INELIGIBLE`, `consent_withdrawn_at` set (informational only).
   - Audit event `insight.evidence.consent_withdrawn` recorded with no personal data in payload.
   - Brief (currently APPROVED) gains `safeguarding_review_required = true`.
4. Attempt `brief_transition(brief_id, 'publish')`.
5. **Expected**: fails with `consent_gate_failed` (safeguarding flag blocks it).

### 1.8 `check_brief_consent_status()` JSON response

1. Call `check_brief_consent_status(brief_id)` with a mix of passing and failing links.
2. **Expected**: `cleared = false`, `blocked_links > 0`, `issues` array contains per-link breakdown including `ledger_withdrawal_at` and `no_original_research_consent` fields where applicable.
3. Call with a fully-cleared brief (no withdrawal, no safeguarding flag, all layer-3 checks pass).
4. **Expected**: `cleared = true`, `blocked_links = 0`, `safeguarding_review_required = false`.

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

### 4.1 Happy path: authenticated user opens printable invoice view

1. Navigate to `/[locale]/admin/partnerships/invoices/[invoiceId]/print` in browser (AAL1 sufficient — read-only).
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

### 6.2 Full brief lifecycle with consent (including withdrawal)

1. Create brief (DRAFT).
2. Add evidence link with all consent fields set (ELIGIBLE, reviewed, fresh, `research_consent_given = true` on the source submission).
3. Submit for review.
4. Check consent status via `check_brief_consent_status()` → `cleared: true`, `safeguarding_review_required: false`.
5. Approve [MFA, `insight.brief.publish`].
6. Call `record_consent_withdrawal(submission_id, 'contributor_requested')` [MFA, `insight.evidence.review`].
7. **Expected**: row in `research_consent_withdrawals`; brief gains `safeguarding_review_required = true`.
8. Attempt `brief_transition(brief_id, 'publish')` → **must fail** with `consent_gate_failed` (safeguarding flag active).
9. **Verify withdrawal is permanent** (security boundary):
   - Attempt to UPDATE `brief_evidence_links SET consent_withdrawn_at = NULL, eligibility = 'ELIGIBLE', consent_active_at_review = true` for the affected link.
   - Call `brief_transition(brief_id, 'publish')` again.
   - **Expected**: still fails. The gate reads `research_consent_withdrawals`, not `brief_evidence_links` metadata. Clearing the evidence link metadata has no effect on the withdrawal record.
10. **Verify safeguarding flag blocks transition even after evidence link cleared**:
    - DELETE the evidence link from the brief entirely.
    - Call `brief_transition(brief_id, 'publish')`.
    - **Expected**: fails with `consent_gate_failed` — safeguarding flag is still set. Removing the evidence link alone is not sufficient.
11. **Unblock via documented content review**:
    - Call `clear_safeguarding_review_flag(brief_id, 'Content reviewed by [name] on [date]. Confirmed brief no longer contains material derived from withdrawn submission. No redistribution of prior published versions claimed.')` [MFA, `insight.brief.publish`].
    - **Expected**: `safeguarding_review_required` → false, review notes and reviewer recorded.
12. Call `brief_transition(brief_id, 'publish')` — **must succeed** (no evidence links remain, no safeguarding flag, no withdrawal blocks).
13. Verify audit log contains: `insight.evidence.consent_withdrawn`, `insight.brief.safeguarding_review_cleared`, `insight.brief.publish`.

---

---

## 7. Migration 20261106 — Immutable Consent Withdrawal Ledger

### 7.1 Staff cannot clear or delete a withdrawal record

```sql
-- Attempt UPDATE (must fail with consent_withdrawal_immutable / SQLSTATE 42501)
update public.research_consent_withdrawals
set reason_code = 'cleared_by_staff'
where submission_id = '<test_submission_id>';

-- Attempt DELETE (must fail with the same trigger)
delete from public.research_consent_withdrawals
where submission_id = '<test_submission_id>';
```

**Expected for both**: trigger `enforce_withdrawal_immutability` fires, SQLSTATE 42501.

### 7.2 Original research consent is checked (Layer 1)

1. Create a `raw_submissions` row with `research_consent_given = false`.
2. Create a brief + evidence link pointing to this submission (insert directly as admin — the gate runs at transition, not at link creation).
3. Call `brief_transition(brief_id, 'approve')`.
4. **Expected**: `consent_gate_failed` — Layer 1 blocks it. Message contains `no research consent recorded in the original submission`.

### 7.3 Submission without research consent is rejected

Confirm via `check_brief_consent_status()`:

1. Call with a brief whose evidence link points to a `research_consent_given = false` submission.
2. **Expected**: `cleared: false`, issue for the link contains `no_original_research_consent`.

### 7.4 Withdrawn submission cannot be reauthorized by editing evidence metadata

1. Record a withdrawal for a submission: `record_consent_withdrawal(submission_id, 'contributor_requested')`.
2. Update the evidence link: `eligibility = 'ELIGIBLE', consent_active_at_review = true, consent_withdrawn_at = NULL, research_consent_verified_at = now()`.
3. Call `brief_transition(brief_id, 'approve')`.
4. **Expected**: `consent_gate_failed` — Layer 2 reads `research_consent_withdrawals` and blocks regardless of layer-3 metadata. Message contains `ledger record`.

### 7.5 Unauthorized users cannot insert withdrawal records

1. Authenticate as a user with `insight.brief.edit` but NOT `insight.evidence.review` (and AAL2).
2. Call `record_consent_withdrawal(submission_id, 'test')`.
3. **Expected**: SQLSTATE 42501 (forbidden).

Also verify direct INSERT is blocked:

```sql
-- As 'authenticated' role (not via the SECURITY DEFINER function)
insert into public.research_consent_withdrawals (submission_id, reason_code)
values ('<id>', 'direct_insert_attempt');
```

**Expected**: RLS denies the insert (no INSERT policy exists for authenticated).

### 7.6 Withdrawal blocks future distribution of affected published briefs

1. Brief is in PUBLISHED status.
2. Call `record_consent_withdrawal(submission_id, 'contributor_requested')` for a submission linked to this brief.
3. **Expected**:
   - Brief gains `safeguarding_review_required = true`, `safeguarding_review_required_since` set.
   - Calling `brief_transition(brief_id, 'archive')` succeeds (archiving is still allowed — it does not claim recall).
   - Attempting `brief_transition(brief_id, 'publish')` on a previously APPROVED brief with the flag set → `consent_gate_failed`.
4. Verify audit record shows `safeguard_flagged` array contains this brief's ID.

### 7.7 No export or publication path bypasses the consent gate

For each release path that produces contributor-derived output:

| Path | Gate enforced? | Test method |
|------|----------------|-------------|
| `brief_transition('approve')` | ✅ Layer 1+2+3 | Steps 7.2–7.4 above |
| `brief_transition('publish')` | ✅ Layer 1+2+3 (re-checked) | Steps 6.2.8–6.2.12 above |
| `saveBriefAction` (direct table write) | ⚠️ No gate — write only; gate runs at transition | Confirm no publication-state column can be set via this action; it only writes DRAFT content |
| Any future export RPC | Must call `assert_brief_consent_cleared()` | Add to this table when new export paths are introduced |

Confirm `saveBriefAction` cannot change `status` to PUBLISHED directly:

1. Call `saveBriefAction` with a payload that includes `"status": "PUBLISHED"`.
2. **Expected**: either the action ignores the status field, or the DB constraint prevents the transition (depends on implementation). Verify status does not become PUBLISHED without going through `brief_transition`.

---

## 8. Negative Tests: Safeguarding Gate and Retired Shim (Migration 20261106 additions)

These tests verify the two security boundaries added or tightened after the initial §7 requirement set.

### 8.1 Safeguarding flag blocks all brief distribution paths

Verify that a brief with `safeguarding_review_required = true` cannot be distributed
through any path — even paths that previously succeeded before the flag was set.

1. Bring a brief to APPROVED status with all consent checks passing.
2. Record a withdrawal: `record_consent_withdrawal(submission_id, 'contributor_requested')` → brief gains `safeguarding_review_required = true`.
3. **Test each distribution-adjacent path**:

   | Path | Expected result |
   |------|----------------|
   | `brief_transition(brief_id, 'publish')` | Fails: `consent_gate_failed` (safeguarding flag check at top of `assert_brief_consent_cleared`) |
   | `brief_transition(brief_id, 'approve')` on a re-opened DRAFT | Fails: same gate |
   | Attempt to call `assert_brief_consent_cleared(brief_id)` directly | Fails: `consent_gate_failed` |
   | `check_brief_consent_status(brief_id)` | Returns `safeguarding_review_required: true`; `cleared: false` |
   | Admin UI loads brief detail page | Loads without error; red safeguarding banner visible |
   | `saveBriefAction` to save content changes | Succeeds (saves as DRAFT only — does not change distribution status) |

4. **Verify that clearing the safeguarding flag does NOT republish** the prior version:
   - Call `clear_safeguarding_review_flag(brief_id, 'Reviewed by staff on [date]. Verified withdrawn content removed.')` [MFA, `insight.brief.publish`].
   - **Expected**: `safeguarding_review_required` → false, reviewer and notes recorded, brief status unchanged (still APPROVED or whatever it was — not re-published).
   - The brief is now eligible for a NEW publish transition, but the act of clearing the flag alone does not trigger one.
   - Confirm brief status in DB did not change as a side-effect of `clear_safeguarding_review_flag()`.

5. Confirm audit log contains:
   - `insight.evidence.consent_withdrawn`
   - `insight.brief.safeguarding_flag_set` (on the affected brief)
   - `insight.brief.safeguarding_review_cleared` (after step 4)

### 8.2 propagate_consent_withdrawal() shim is retired and raises an error

Verify that the legacy `propagate_consent_withdrawal()` function can no longer be
called by authenticated users, and that its body raises a clear error directing
callers to use `record_consent_withdrawal()` instead.

1. **Permission check** — confirm EXECUTE has been revoked:

   ```sql
   select grantee, privilege_type, routine_name
   from information_schema.routine_privileges
   where routine_name = 'propagate_consent_withdrawal'
     and grantee = 'authenticated';
   ```

   **Expected**: 0 rows (EXECUTE revoked from authenticated).

2. **Runtime error check** — attempt to call the function as a superuser or service_role:

   ```sql
   select public.propagate_consent_withdrawal('<any_uuid>'::uuid);
   ```

   **Expected**: raises SQLSTATE 42501 with message containing `propagate_consent_withdrawal_retired`
   and directing the caller to use `record_consent_withdrawal()`.

3. **Application code audit** — confirm no application code calls the retired function:

   ```bash
   grep -r "propagate_consent_withdrawal" lib/ app/ components/ --include="*.ts" --include="*.tsx"
   ```

   **Expected**: 0 matches.

4. **Withdrawal still works via the authoritative path** — confirm `record_consent_withdrawal()` is callable and writes the ledger:
   - Authenticate with AAL2 + `insight.evidence.review`.
   - Call `record_consent_withdrawal('<submission_id>', 'contributor_requested')`.
   - **Expected**: row in `research_consent_withdrawals`, audit event recorded.

### 8.3 Brief Storage paths do not produce public distribution

Verify that `uploaded_pdf_storage_path` and `generated_pdf_storage_path` on
`institutional_briefs` cannot be used to bypass the safeguarding gate.

1. Query a brief with `safeguarding_review_required = true` and non-null storage paths.
2. **Expected**: no application route handler exists that generates a signed URL
   or public URL for these storage paths. Confirm:
   ```bash
   grep -r "createSignedUrl\|getPublicUrl\|uploaded_pdf_storage_path\|generated_pdf_storage_path" \
     app/ lib/actions/ lib/data/ --include="*.ts" --include="*.tsx" | grep -v "insights.ts"
   ```
   **Expected**: 0 matches outside `lib/data/admin/insights.ts` (where the field is selected for admin display only).
3. No brief PDF Storage bucket is configured — confirm by listing Supabase Storage buckets:
   - **Expected**: no bucket named `brief-pdfs`, `institutional-briefs`, or similar.
4. Storage paths are inert data: they cannot be served until a route handler and bucket are deliberately configured.

---

## Cleanup

After all tests pass on the branch:
- Delete the Supabase branch (disposable)
- Do not merge branch migrations to production without explicit approval
- Record results in the deployment readiness report

---

*Last updated: 2026-11-02. Not applied to production.*
