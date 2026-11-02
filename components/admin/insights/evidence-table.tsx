"use client";

import { useState, useTransition } from "react";
import type { EvidenceLinkListItem } from "@/lib/data/admin/insights";
import { revalidateConsentAction } from "@/lib/actions/admin/insights";

const ELIGIBILITY_LABELS: Record<string, string> = {
  ELIGIBLE: "Eligible",
  INELIGIBLE: "Ineligible",
  UNDER_REVIEW: "Under review",
  EXCLUDED: "Excluded",
};

const ELIGIBILITY_CLASSES: Record<string, string> = {
  ELIGIBLE: "bg-emerald-100 text-emerald-800",
  INELIGIBLE: "bg-red-100 text-red-800",
  UNDER_REVIEW: "bg-amber-100 text-amber-800",
  EXCLUDED: "bg-stone-200 text-stone-600",
};

function ConsentCell({
  link,
}: {
  link: EvidenceLinkListItem;
}) {
  const [status, setStatus] = useState<boolean | null>(link.consent_active_at_review ?? null);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(
    link.research_consent_verified_at,
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRevalidate() {
    setError(null);
    startTransition(async () => {
      const result = await revalidateConsentAction(link.link_id);
      if (result.ok) {
        setStatus(result.value.consent_active);
        setVerifiedAt(new Date().toISOString());
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            status === null
              ? "bg-stone-300"
              : status
                ? "bg-emerald-500"
                : "bg-red-500"
          }`}
          aria-hidden="true"
        />
        <span className="text-xs text-ink-soft">
          {status === null ? "Not verified" : status ? "Active" : "Withdrawn"}
        </span>
      </div>
      {verifiedAt && (
        <p className="text-[0.65rem] text-ink-soft">
          Verified {new Date(verifiedAt).toLocaleDateString()}
        </p>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={handleRevalidate}
        className="text-[0.65rem] font-semibold text-plum-700 hover:text-plum-900 hover:underline disabled:opacity-50"
      >
        {pending ? "Checking…" : "Revalidate"}
      </button>
      {error && <p className="text-[0.65rem] text-danger">{error}</p>}
    </div>
  );
}

export function EvidenceTable({ links }: { links: EvidenceLinkListItem[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <table className="w-full text-sm">
        <thead className="border-b border-line bg-surface">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
              Brief
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft sm:table-cell">
              Submission ref
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
              Eligibility
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft md:table-cell">
              Research consent
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft lg:table-cell">
              Safeguarding
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft lg:table-cell">
              Decision
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-white">
          {links.map((link) => (
            <tr key={link.link_id} className="hover:bg-cream-50">
              <td className="px-4 py-3">
                <p className="font-semibold text-ink">{link.brief_title}</p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {new Date(link.created_at).toLocaleDateString()}
                </p>
              </td>
              <td className="hidden px-4 py-3 sm:table-cell">
                <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-700">
                  {link.submission_id.slice(0, 8)}…
                </code>
                <p className="mt-0.5 text-xs text-ink-soft">
                  Internal ref — not a contributor identifier
                </p>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${
                    ELIGIBILITY_CLASSES[link.eligibility] ?? "bg-stone-100 text-stone-700"
                  }`}
                >
                  {ELIGIBILITY_LABELS[link.eligibility] ?? link.eligibility}
                </span>
              </td>
              <td className="hidden px-4 py-3 md:table-cell">
                <ConsentCell link={link} />
              </td>
              <td className="hidden px-4 py-3 lg:table-cell">
                <div className="space-y-1">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${
                      link.human_review_completed
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {link.human_review_completed ? "Reviewed" : "Pending"}
                  </span>
                  {link.reidentification_risk_flagged && (
                    <p className="text-[0.65rem] font-semibold text-danger">
                      ⚠ Re-ID risk flagged
                    </p>
                  )}
                </div>
              </td>
              <td className="hidden px-4 py-3 lg:table-cell">
                {link.inclusion_decision === null ? (
                  <span className="text-xs text-ink-soft">Pending</span>
                ) : link.inclusion_decision ? (
                  <span className="text-xs font-semibold text-emerald-700">Included</span>
                ) : (
                  <span className="text-xs font-semibold text-stone-500">Excluded</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-line bg-surface px-4 py-3">
        <p className="text-xs text-ink-soft">
          {links.length} evidence link{links.length !== 1 ? "s" : ""}. Submission
          references shown are internal identifiers only — not contributor names or
          contact details.
        </p>
      </div>
    </div>
  );
}
