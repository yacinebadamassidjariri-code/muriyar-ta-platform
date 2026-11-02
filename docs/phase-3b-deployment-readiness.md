# Phase 3B Deployment Readiness Report

**Date**: 2026-11-02  
**Prepared by**: Claude Sonnet 4.6 (Phase 3B hardening pass)  
**Status**: PENDING STAGING REHEARSAL  
**Constraint**: Do not apply production migrations or deploy without explicit approval.

---

## Migration Files (apply in this exact order)

| Migration | File | Status |
|-----------|------|--------|
| 1 | `20261101000000_institutional_commercial_schema.sql` | Pre-existing |
| 2 | `20261102000000_invoice_number_sequence.sql` | Pre-existing |
| 3 | `20261103000000_brief_consent_gate.sql` | **NEW — Phase 3B** |
| 4 | `20261104000000_financial_integrity.sql` | **NEW — Phase 3B** |
| 5 | `20261105000000_mfa_rpc_hardening.sql` | **NEW — Phase 3B** |
| 6 | `20261106000000_research_consent_withdrawals.sql` | **NEW — Phase 3B (closes A15)** |

---

## Deployment Readiness Checklist

### A. Research Consent Enforcement (Migration 20261103)

| # | Requirement | Implementation | Status |
|---|-------------|----------------|--------|
| A1 | `brief_transition('approve')` blocked when evidence consent is stale/missing | `assert_brief_consent_cleared()` called before UPDATE | ✅ IMPLEMENTED |
| A2 | `brief_transition('publish')` blocked independently (re-check even after APPROVE) | Second `assert_brief_consent_cleared()` call in publish branch | ✅ IMPLEMENTED |
| A3 | Consent verification freshness: 90-day window | `research_consent_verified_at < now() - interval '90 days'` check | ✅ IMPLEMENTED |
| A4 | Withdrawn consent blocks brief | `consent_withdrawn_at IS NOT NULL` check | ✅ IMPLEMENTED |
| A5 | Ineligible evidence blocks brief | `eligibility <> 'ELIGIBLE'` check | ✅ IMPLEMENTED |
| A6 | Re-identification risk blocks brief | `reidentification_risk_flagged = true` check | ✅ IMPLEMENTED |
| A7 | Human review must be completed | `human_review_completed = false` check | ✅ IMPLEMENTED |
| A8 | Inclusion decision must be true | `inclusion_decision IS NULL OR NOT inclusion_decision` check | ✅ IMPLEMENTED |
| A9 | Sample briefs exempt from consent checks | `if v_sample then return;` — early exit in `assert_brief_consent_cleared()` | ✅ IMPLEMENTED |
| A10 | Sample briefs cannot have real evidence links | Trigger `no_evidence_on_sample_briefs` on `brief_evidence_links` | ✅ IMPLEMENTED |
| A11 | Consent withdrawal propagates to all linked briefs | `propagate_consent_withdrawal()` RPC sets INELIGIBLE + `consent_withdrawn_at` | ✅ IMPLEMENTED |
| A12 | Admin UI pre-flight check available | `check_brief_consent_status()` returns per-link JSON breakdown | ✅ IMPLEMENTED |
| A13 | Requires AAL2 + `insight.brief.publish` permission | `require_aal2()` + `has_permission()` in `brief_transition()` | ✅ IMPLEMENTED |
| A14 | **Staging test results** | See staging test plan §1, §7 | ⬜ NOT TESTED |
| A15 | Consent gate joins authoritative sources (not mutable metadata) | `assert_brief_consent_cleared()` rewritten in 20261106: Layer 1 joins `raw_submissions.research_consent_given` (immutable); Layer 2 checks `research_consent_withdrawals` ledger (immutable); Layer 3 checks `brief_evidence_links` quality metadata. Staff-editable fields cannot override Layers 1 or 2. | ✅ IMPLEMENTED (migration 20261106) |
| A16 | Withdrawal records are immutable | `enforce_withdrawal_immutability` trigger on `research_consent_withdrawals` raises SQLSTATE 42501 on any UPDATE or DELETE | ✅ IMPLEMENTED (migration 20261106) |
| A17 | Withdrawal recorded via controlled audited function only | `record_consent_withdrawal()` SECURITY DEFINER RPC — only path to INSERT; direct INSERT revoked from all application roles; `record_consent_withdrawal()` requires AAL2 + `insight.evidence.review` | ✅ IMPLEMENTED (migration 20261106) |
| A18 | Safeguarding flag set on APPROVED/PUBLISHED briefs when withdrawal occurs | `record_consent_withdrawal()` sets `safeguarding_review_required = true` with reason text on affected briefs; flag blocks all publish/approve transitions | ✅ IMPLEMENTED (migration 20261106) |
| A19 | Safeguarding flag cleared only by authorized reviewer with documented notes | `clear_safeguarding_review_flag()` requires AAL2 + `insight.brief.publish` + non-empty review notes; audited | ✅ IMPLEMENTED (migration 20261106) |
| A20 | Evidence link removal does not automatically clear a brief for release | Removing a link does not clear `safeguarding_review_required`; flag must be cleared separately via documented content review | ✅ IMPLEMENTED (by design — flag lives on `institutional_briefs`, not on the link) |
| A21 | No staff-created reconsent path exists | `research_consent_withdrawals` has no DELETE; staff cannot clear a withdrawal. New consent requires a new `raw_submissions` row from the contributor's own submission (via `submit_story()`). | ✅ IMPLEMENTED (migration 20261106) |

---

### B. Financial Integrity (Migration 20261104)

| # | Requirement | Implementation | Status |
|---|-------------|----------------|--------|
| B1 | Overpayment prevented at DB level | Balance check after `FOR UPDATE` lock, raises `overpayment` | ✅ IMPLEMENTED |
| B2 | Concurrent overpayment prevented | `FOR UPDATE` serializes concurrent payment attempts | ✅ IMPLEMENTED |
| B3 | Payment on CANCELLED invoice rejected | `invoice_cancelled` exception before balance check | ✅ IMPLEMENTED |
| B4 | Payment on PAID invoice rejected | `invoice_already_paid` exception before balance check | ✅ IMPLEMENTED |
| B5 | Server action surfaces overpayment error | `error.message.includes("overpayment")` check in `recordPaymentAction` | ✅ IMPLEMENTED |
| B6 | `audit.write_event()` 4-argument bug fixed | `create_invoice()` rewritten with correct 4-arg call | ✅ IMPLEMENTED |
| B7 | Invoice number advisory lock preserved | `pg_advisory_xact_lock(20261102, hashtext('invoice_seq_' || v_year))` kept | ✅ IMPLEMENTED |
| B8 | Requires AAL2 + `commercial.edit` | `require_aal2()` + `has_permission('commercial.edit')` in both RPCs | ✅ IMPLEMENTED |
| B9 | **Staging test results** | See staging test plan §2 | ⬜ NOT TESTED |

---

### C. MFA Enforcement Standardization (Migration 20261105)

| # | Requirement | Implementation | Status |
|---|-------------|----------------|--------|
| C1 | `save_organization` RPC created (SECURITY DEFINER, AAL2) | Migration 20261105 | ✅ IMPLEMENTED |
| C2 | `save_opportunity` RPC created (SECURITY DEFINER, AAL2) | Migration 20261105 | ✅ IMPLEMENTED |
| C3 | `save_proposal` RPC created (SECURITY DEFINER, AAL2) | Migration 20261105 | ✅ IMPLEMENTED |
| C4 | `save_contract` RPC created (SECURITY DEFINER, AAL2) | Migration 20261105 | ✅ IMPLEMENTED |
| C5 | `save_package` RPC created (SECURITY DEFINER, AAL2) | Migration 20261105 | ✅ IMPLEMENTED |
| C6 | Direct INSERT/UPDATE/DELETE revoked from `authenticated` on all 5 tables | `REVOKE` statement in 20261105 | ✅ IMPLEMENTED |
| C7 | Internal cost fields (`est_labor_cost_usd`, `est_overhead_usd`) stored but NOT in audit payload | `save_package` excludes cost fields from `audit.write_event` payload | ✅ IMPLEMENTED |
| C8 | All 5 server actions updated to call RPCs | `lib/actions/admin/partnerships.ts` rewritten | ✅ IMPLEMENTED |
| C9 | Server actions handle `forbidden` error from RPCs | `error.message.includes("forbidden")` check added | ✅ IMPLEMENTED |
| C10 | **Staging test — direct write grants revoked** | SQL check in staging test plan §3.1 | ⬜ NOT TESTED |
| C11 | **Staging test — AAL1 session rejected** | Staging test plan §3.2 | ⬜ NOT TESTED |
| C12 | **Staging test — AAL2 session accepted** | Staging test plan §3.3–3.4 | ⬜ NOT TESTED |

---

### D. PDF Invoice Generation

| # | Requirement | Implementation | Status |
|---|-------------|----------------|--------|
| D1 | Route exists at `/[locale]/admin/partnerships/invoices/[invoiceId]/pdf` | `app/[locale]/admin/partnerships/invoices/[invoiceId]/pdf/route.ts` | ✅ IMPLEMENTED |
| D2 | Requires `commercial.read` permission | `requirePermission("commercial.read")` at top of GET handler | ✅ IMPLEMENTED |
| D3 | Unauthenticated returns 403 | `try/catch` around `requirePermission`, returns `NextResponse("Forbidden", {status:403})` | ✅ IMPLEMENTED |
| D4 | `internal_notes` absent from rendered HTML | Verified by static analysis — not in HTML template | ✅ VERIFIED |
| D5 | `est_labor_cost_usd` absent | Verified by static analysis | ✅ VERIFIED |
| D6 | `est_overhead_usd` absent | Verified by static analysis | ✅ VERIFIED |
| D7 | `est_staff_hours` absent | Verified by static analysis | ✅ VERIFIED |
| D8 | `contract_id` absent | Verified by static analysis | ✅ VERIFIED |
| D9 | Payment `notes` absent | Only `payment_date`, `amount_usd`, `reference` used per payment | ✅ VERIFIED |
| D10 | Includes: org name, invoice number, dates, amount, currency, payments, balance, status | All fields present in template | ✅ IMPLEMENTED |
| D11 | XSS protection on all dynamic values | `escHtml()` applied to all user-controlled strings | ✅ IMPLEMENTED |
| D12 | No-cache header | `Cache-Control: no-store` | ✅ IMPLEMENTED |
| D13 | Print-optimised CSS (`@media print`) | Hides screen-only UI, sets A4 page margins | ✅ IMPLEMENTED |
| D14 | "Print / Save as PDF" link on invoice detail page | `[invoiceId]/page.tsx` sidebar — renamed from "Download invoice PDF" | ✅ IMPLEMENTED |
| D15 | Route accurately labelled as printable HTML (not PDF) | Route moved to `/print`, comment updated, `Content-Disposition` updated | ✅ IMPLEMENTED |
| D16 | No external PDF library required | Pure HTML + browser Print dialog | ✅ IMPLEMENTED |
| D17 | **Staging browser test** | See staging test plan §4 | ⬜ NOT TESTED |

---

### E. Build Verification

| # | Check | Result | Notes |
|---|-------|--------|-------|
| E1 | `npm install` | ⚠️ BLOCKED | `registry.npmjs.org` DNS unreachable from this cloud container (ENOTFOUND). Allowlist includes npmjs.org but direct DNS resolution fails. Run `npm install` from a machine with normal internet access. |
| E2 | `npx tsc --noEmit` | ⬜ NOT RUN | Requires `node_modules` installed (E1 blocked) |
| E3 | `npm run lint` | ⬜ NOT RUN | Requires `node_modules` installed |
| E4 | `npm run build` | ⬜ NOT RUN | Requires `node_modules` installed |
| E5 | Static source check: all Phase 3B files exist | ✅ PASS | 6/6 files present |
| E6 | Static source check: forbidden fields absent from PDF template | ✅ PASS | All 5 fields absent |
| E7 | Static source check: security patterns present in migrations | ✅ PASS | All critical patterns verified |
| E8 | TypeScript `params: Promise<...>` pattern used (Next.js 16) | ✅ PASS | Both new route files use `await params` |

**Build verification action required**: Run `npm install && npx tsc --noEmit && npm run build` locally before staging deploy.

---

### F. Standing Security Constraints (must be re-verified before every deploy)

| # | Constraint | Status |
|---|------------|--------|
| F1 | Encrypted original question never overwritten | Not touched by Phase 3B | ✅ PRESERVED |
| F2 | Unpublished Q&A inaccessible to public | Not touched by Phase 3B | ✅ PRESERVED |
| F3 | Existing RLS rules not weakened | Phase 3B added restrictions only | ✅ PRESERVED |
| F4 | Only authorized staff can publish/remove public content | `require_aal2()` + `has_permission()` enforced | ✅ PRESERVED |
| F5 | Sensitive submissions not exposed in logs | Audit payloads contain IDs/counts, not submission text | ✅ PRESERVED |
| F6 | Stories functionality not weakened | Not touched by Phase 3B | ✅ PRESERVED |
| F7 | Encryption keys not exposed | Not touched by Phase 3B | ✅ PRESERVED |
| F8 | Turnstile verification not bypassed | Not touched by Phase 3B | ✅ PRESERVED |
| F9 | Internal cost fields not in client-facing output | PDF template verified; audit payloads verified | ✅ PRESERVED |
| F10 | Evidence links remain internal/access-controlled | RLS not modified for evidence tables | ✅ PRESERVED |
| F11 | No raw submissions in client outputs | PDF route uses only invoice/org/payment data | ✅ PRESERVED |

---

### G. Consent Gate Authority — RESOLVED by Migration 20261106

The gap identified in section A15 has been closed. Migration `20261106000000_research_consent_withdrawals.sql` implements the approved Option A architecture.

#### What changed

| Component | Before (20261103) | After (20261106) |
|-----------|-------------------|------------------|
| Withdrawal authority | `brief_evidence_links.consent_withdrawn_at` (staff-editable) | `research_consent_withdrawals` ledger (append-only, immutable) |
| Original consent authority | Not checked | `raw_submissions.research_consent_given` (immutable, joined in Layer 1) |
| `assert_brief_consent_cleared()` | Read mutable evidence link metadata only | Layer 1 (raw_submissions) + Layer 2 (withdrawal ledger) + Layer 3 (review quality) |
| Staff bypass possible | Yes — clear `consent_withdrawn_at`, set `eligibility = 'ELIGIBLE'` | No — layers 1 and 2 cannot be altered by staff; trigger enforces immutability |
| Post-publication withdrawal handling | None | `safeguarding_review_required` flag on brief; blocks all transitions until cleared by authorized reviewer with documented notes |
| Withdrawal entry point | `propagate_consent_withdrawal()` (mutable side-effect) | `record_consent_withdrawal()` SECURITY DEFINER RPC (controlled, audited, append-only) |

#### Authoritative sources (post-20261106)

| Record | Table | Mutable? |
|--------|-------|----------|
| Original research consent | `raw_submissions.research_consent_given` | **No** — `protect_raw_submission_original()` trigger |
| Post-submission withdrawal | `research_consent_withdrawals` | **No** — `enforce_withdrawal_immutability` trigger + no application-role DELETE |
| Review quality metadata | `brief_evidence_links` | Yes (staff-managed) — Layer 3 only; cannot override Layers 1 or 2 |

**Status**: IMPLEMENTED — pending staging rehearsal and explicit production authorization.

---

## Summary

| Area | Implementation | Staging Tests | Build |
|------|---------------|---------------|-------|
| A. Consent gate | ✅ Complete — 3-layer check (raw_submissions + withdrawal ledger + review quality) | ⬜ Not tested (§1, §7) | N/A |
| B. Financial integrity | ✅ Complete | ⬜ Not tested (§2) | N/A |
| C. MFA enforcement | ✅ Complete | ⬜ Not tested (§3) | N/A |
| D. Printable invoice | ✅ Complete — relabelled from "PDF" to "Print / Save as PDF" | ⬜ Not tested (§4) | N/A |
| E. Build verification | ⚠️ Blocked (DNS in cloud container) | N/A | ⬜ Pending local run |
| F. Security constraints | ✅ All preserved | ✅ Verified by static analysis | N/A |
| G. Consent architecture | ✅ RESOLVED — migration 20261106 implemented | ⬜ Not tested (§7) | N/A |

**Gate criteria for production deploy — all must be met:**
1. ✅ Consent architecture fix implemented (migration 20261106)
2. ⬜ All staging test scenarios pass (§1–§7 of staging test plan)
3. ⬜ `npm install && npx tsc --noEmit && npm run build` exits 0 (run locally)
4. ⬜ Explicit production deploy authorization from project owner
5. ⬜ Migrations applied to production in the correct order (20261101→20261102→20261103→20261104→20261105→20261106)

---

*This report reflects the state of the codebase as of 2026-11-02. Nothing has been applied to production.*
