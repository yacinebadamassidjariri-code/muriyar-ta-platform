/**
 * Invoice PDF route — GET /[locale]/admin/partnerships/invoices/[invoiceId]/pdf
 *
 * Returns a print-optimised HTML document.  The browser's native Print dialog
 * (File → Print → Save as PDF, or Cmd/Ctrl+P) converts it to a professional
 * PDF without any server-side PDF library.
 *
 * Security constraints enforced here:
 *   - Requires an authenticated session with commercial.read permission.
 *   - Does NOT expose: internal_notes, est_labor_cost_usd, est_overhead_usd,
 *     est_staff_hours, contract details, submission content, contributor
 *     identities, or any admin-only fields.
 *   - Payment notes are suppressed from the client-facing document.
 *   - The route is admin-only (under /admin/...) and protected by middleware.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guards";
import type { InvoicePayment, InvoiceStatus } from "@/lib/data/admin/partnerships";
import { getInvoice } from "@/lib/data/admin/partnerships";

export const dynamic = "force-dynamic";

// Human-readable status labels for the client-facing document.
const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT:          "Draft",
  ISSUED:         "Issued",
  PARTIALLY_PAID: "Partially Paid",
  PAID:           "Paid in Full",
  OVERDUE:        "Overdue",
  CANCELLED:      "Cancelled",
};

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; invoiceId: string }> },
) {
  const { invoiceId } = await params;

  // Auth: must have at least commercial.read.
  try {
    await requirePermission("commercial.read");
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const result = await getInvoice(invoiceId);
  if (!result.ok) {
    return new NextResponse("Invoice not found", { status: 404 });
  }

  const invoice = result.value;
  const statusLabel = STATUS_LABELS[invoice.status] ?? invoice.status;

  // Build payment rows — DO NOT include payment.notes (internal field).
  const paymentRows = invoice.payments
    .map(
      (p: InvoicePayment) => `
      <tr>
        <td>${fmtDate(p.payment_date)}</td>
        <td>${p.reference ? escHtml(p.reference) : "—"}</td>
        <td class="amount">${fmt(p.amount_usd)}</td>
      </tr>`,
    )
    .join("");

  const issuedFormatted = fmtDate(invoice.issue_date);
  const dueFormatted    = invoice.due_date ? fmtDate(invoice.due_date) : "—";
  const todayFormatted  = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice ${escHtml(invoice.invoice_number)}</title>
  <style>
    /* ── Reset & base ─────────────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { font-size: 11pt; }
    body {
      font-family: Georgia, "Times New Roman", serif;
      color: #111;
      background: #fff;
      padding: 48px 60px;
      max-width: 800px;
      margin: 0 auto;
    }

    /* ── Typography ───────────────────────────────────────────── */
    h1 { font-size: 22pt; font-weight: bold; letter-spacing: -0.5px; }
    h2 { font-size: 10pt; font-weight: bold; text-transform: uppercase;
         letter-spacing: 0.12em; color: #666; margin-bottom: 6px; }

    /* ── Layout helpers ───────────────────────────────────────── */
    .header         { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
    .header-left    { flex: 1; }
    .header-right   { text-align: right; }
    .divider        { border: none; border-top: 1.5px solid #222; margin: 20px 0; }
    .divider-light  { border: none; border-top: 1px solid #ddd; margin: 14px 0; }

    /* ── Meta grid ────────────────────────────────────────────── */
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin: 20px 0;
    }
    .meta-item dt { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.12em; color: #666; }
    .meta-item dd { font-size: 11pt; font-weight: bold; margin-top: 2px; }

    /* ── Summary boxes ────────────────────────────────────────── */
    .summary-row {
      display: flex;
      gap: 16px;
      margin: 20px 0;
    }
    .summary-box {
      flex: 1;
      border: 1px solid #ddd;
      padding: 12px 16px;
      text-align: center;
    }
    .summary-box dt { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.1em; color: #666; }
    .summary-box dd { font-size: 14pt; font-weight: bold; margin-top: 4px; }
    .balance-due dd { color: #b45309; }
    .paid-full dd   { color: #166534; }

    /* ── Payments table ───────────────────────────────────────── */
    table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    thead tr { background: #f5f5f5; }
    th { text-align: left; padding: 8px 10px; font-size: 8.5pt;
         text-transform: uppercase; letter-spacing: 0.1em; color: #555; }
    td { padding: 8px 10px; border-bottom: 1px solid #eee; }
    td.amount { text-align: right; font-variant-numeric: tabular-nums; }
    th.amount  { text-align: right; }

    /* ── Status badge ─────────────────────────────────────────── */
    .status-badge {
      display: inline-block;
      padding: 3px 10px;
      font-size: 8.5pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      border: 1.5px solid #222;
    }

    /* ── Footer ───────────────────────────────────────────────── */
    .footer {
      margin-top: 40px;
      padding-top: 14px;
      border-top: 1px solid #ddd;
      font-size: 8pt;
      color: #888;
    }

    /* ── Screen-only UI (print button) ───────────────────────── */
    .screen-only {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-bottom: 32px;
    }
    .btn-print {
      padding: 8px 20px;
      background: #1a1a1a;
      color: #fff;
      border: none;
      font-size: 11pt;
      cursor: pointer;
      font-family: -apple-system, sans-serif;
    }
    .btn-print:hover { background: #333; }
    .btn-back {
      padding: 8px 20px;
      background: #fff;
      color: #1a1a1a;
      border: 1px solid #999;
      font-size: 11pt;
      cursor: pointer;
      font-family: -apple-system, sans-serif;
    }
    .btn-back:hover { background: #f5f5f5; }

    /* ── Print overrides ──────────────────────────────────────── */
    @media print {
      html { font-size: 10pt; }
      body { padding: 0; max-width: none; }
      .screen-only { display: none !important; }
      @page { margin: 18mm 18mm 20mm; size: A4; }
      table { page-break-inside: avoid; }
    }
  </style>
</head>
<body>

  <!-- Print / Back buttons — hidden in print output -->
  <div class="screen-only" aria-hidden="true">
    <button class="btn-back" onclick="history.back()">← Back</button>
    <button class="btn-print" onclick="window.print()">Save as PDF / Print</button>
  </div>

  <!-- ── Header ─────────────────────────────────────────────── -->
  <header class="header">
    <div class="header-left">
      <p style="font-size:8pt;text-transform:uppercase;letter-spacing:0.14em;color:#666;margin-bottom:6px;">
        Muriyar Ta
      </p>
      <h1>${escHtml(invoice.invoice_number)}</h1>
      ${invoice.title ? `<p style="margin-top:4px;color:#555;">${escHtml(invoice.title)}</p>` : ""}
    </div>
    <div class="header-right">
      <p class="status-badge">${escHtml(statusLabel)}</p>
      <p style="margin-top:8px;font-size:9pt;color:#666;">Generated ${escHtml(todayFormatted)}</p>
    </div>
  </header>

  <hr class="divider" />

  <!-- ── Bill-to / Meta ─────────────────────────────────────── -->
  <div style="display:flex;justify-content:space-between;gap:40px;margin-bottom:20px;">
    <div>
      <h2>Bill to</h2>
      <p style="font-size:12pt;font-weight:bold;">${escHtml(invoice.org_name)}</p>
    </div>
    <div style="text-align:right;">
      <dl style="font-size:10pt;line-height:1.8;">
        <div><dt style="display:inline;color:#666;">Invoice No: </dt><dd style="display:inline;font-weight:bold;">${escHtml(invoice.invoice_number)}</dd></div><br/>
        <div><dt style="display:inline;color:#666;">Issue Date: </dt><dd style="display:inline;">${escHtml(issuedFormatted)}</dd></div><br/>
        <div><dt style="display:inline;color:#666;">Due Date: </dt><dd style="display:inline;">${escHtml(dueFormatted)}</dd></div>
      </dl>
    </div>
  </div>

  <hr class="divider-light" />

  <!-- ── Financial summary ──────────────────────────────────── -->
  <div class="summary-row">
    <dl class="summary-box">
      <dt>Invoice Amount</dt>
      <dd>${escHtml(fmt(invoice.amount_usd))}</dd>
    </dl>
    <dl class="summary-box">
      <dt>Total Received</dt>
      <dd>${escHtml(fmt(invoice.paid_total))}</dd>
    </dl>
    <dl class="summary-box ${invoice.balance_usd === 0 ? "paid-full" : "balance-due"}">
      <dt>${invoice.balance_usd === 0 ? "Paid in Full" : "Balance Due"}</dt>
      <dd>${escHtml(fmt(invoice.balance_usd))}</dd>
    </dl>
  </div>

  <!-- ── Payment history ────────────────────────────────────── -->
  ${
    invoice.payments.length > 0
      ? `
  <h2 style="margin-top:28px;margin-bottom:10px;">Payments Received</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Reference</th>
        <th class="amount">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${paymentRows}
    </tbody>
    <tfoot>
      <tr style="font-weight:bold;border-top:2px solid #222;">
        <td colspan="2">Total received</td>
        <td class="amount">${escHtml(fmt(invoice.paid_total))}</td>
      </tr>
    </tfoot>
  </table>`
      : `<p style="margin-top:28px;color:#666;font-size:10pt;">No payments recorded.</p>`
  }

  <!-- ── Currency note ──────────────────────────────────────── -->
  <p style="margin-top:20px;font-size:9pt;color:#888;">
    All amounts in ${escHtml(invoice.currency)}.
  </p>

  <!-- ── Footer ─────────────────────────────────────────────── -->
  <div class="footer">
    <p>
      This document is issued by Muriyar Ta for reference purposes.
      Please reconcile against your accounting system and bank statements.
      This document does not constitute official accounting records.
    </p>
    <p style="margin-top:6px;">
      Questions? Contact partnerships@muriyarta.org
    </p>
  </div>

</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Suggest a filename when the browser's save-as dialog is used.
      "Content-Disposition": `inline; filename="invoice-${invoice.invoice_number}.html"`,
      // Never cache — invoice state changes.
      "Cache-Control": "no-store",
    },
  });
}

/** Minimal HTML entity escaping to prevent XSS in the generated document. */
function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
