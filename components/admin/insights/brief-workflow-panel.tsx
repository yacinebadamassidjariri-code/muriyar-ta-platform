"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BriefDetail } from "@/lib/data/admin/insights";
import { briefTransitionAction } from "@/lib/actions/admin/insights";

type TransitionAction =
  | "submit_review"
  | "approve"
  | "publish"
  | "archive"
  | "return_to_draft";

const TRANSITIONS: Record<
  string, // current status
  { action: TransitionAction; label: string; variant: "primary" | "secondary" | "danger" }[]
> = {
  DRAFT: [{ action: "submit_review", label: "Submit for review", variant: "primary" }],
  IN_REVIEW: [
    { action: "approve", label: "Approve", variant: "primary" },
    { action: "return_to_draft", label: "Return to draft", variant: "secondary" },
  ],
  APPROVED: [
    { action: "publish", label: "Publish", variant: "primary" },
    { action: "return_to_draft", label: "Return to draft", variant: "secondary" },
    { action: "archive", label: "Archive", variant: "secondary" },
  ],
  PUBLISHED: [{ action: "archive", label: "Archive", variant: "secondary" }],
  ARCHIVED: [],
};

export function BriefWorkflowPanel({ brief }: { brief: BriefDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<TransitionAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const transitions = TRANSITIONS[brief.status] ?? [];

  function handleTransition(action: TransitionAction) {
    setError(null);
    setPendingAction(action);
    startTransition(async () => {
      const result = await briefTransitionAction(brief.brief_id, action, note);
      setPendingAction(null);
      if (result.ok) {
        setNote("");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <aside className="space-y-4">
      <section className="rounded-xl border border-line bg-surface p-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
          Workflow
        </h2>

        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">Status</dt>
            <dd className="font-semibold text-ink">{brief.status.replace("_", " ")}</dd>
          </div>
          {brief.submitted_for_review_at && (
            <div className="flex justify-between">
              <dt className="text-ink-soft">Submitted</dt>
              <dd className="text-ink">
                {new Date(brief.submitted_for_review_at).toLocaleDateString()}
              </dd>
            </div>
          )}
          {brief.approved_at && (
            <div className="flex justify-between">
              <dt className="text-ink-soft">Approved</dt>
              <dd className="text-ink">
                {new Date(brief.approved_at).toLocaleDateString()}
              </dd>
            </div>
          )}
          {brief.published_at && (
            <div className="flex justify-between">
              <dt className="text-ink-soft">Published</dt>
              <dd className="text-ink">
                {new Date(brief.published_at).toLocaleDateString()}
              </dd>
            </div>
          )}
        </dl>

        {transitions.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-line pt-4">
            <label htmlFor="transition-note" className="block text-xs font-semibold text-ink-soft">
              Transition note (optional)
            </label>
            <textarea
              id="transition-note"
              value={note}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
              rows={2}
              placeholder="Add a note for the audit record…"
              className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
            />
            <div className="flex flex-col gap-2">
              {transitions.map((t) => (
                <button
                  key={t.action}
                  type="button"
                  disabled={pending}
                  onClick={() => handleTransition(t.action)}
                  className={
                    t.variant === "primary"
                      ? "inline-flex min-h-11 w-full items-center justify-center rounded-md bg-plum-700 px-4 text-sm font-semibold text-white hover:bg-plum-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600 disabled:opacity-60"
                      : "inline-flex min-h-11 w-full items-center justify-center rounded-md border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-plum-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600 disabled:opacity-60"
                  }
                >
                  {pending && pendingAction === t.action ? "Working…" : t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 text-xs text-danger">
            {error}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-line bg-surface p-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
          Details
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">Language</dt>
            <dd className="text-ink">{brief.language_code?.toUpperCase() ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">Theme</dt>
            <dd className="text-ink">{brief.research_theme ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">Created</dt>
            <dd className="text-ink">{new Date(brief.created_at).toLocaleDateString()}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">Last updated</dt>
            <dd className="text-ink">{new Date(brief.updated_at).toLocaleDateString()}</dd>
          </div>
        </dl>
      </section>

      {brief.status === "APPROVED" && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-900">Pre-publication checklist</p>
          <ul className="mt-2 space-y-1 text-xs text-amber-800">
            <li>✓ Research consent revalidated for all evidence links</li>
            <li>✓ Human safeguarding review completed</li>
            <li>✓ Limitations section reviewed for accuracy</li>
            <li>✓ No raw submission identifiers in any content field</li>
          </ul>
          <p className="mt-2 text-xs text-amber-700">
            Confirm these before publishing. Publication is recorded in the audit trail.
          </p>
        </section>
      )}
    </aside>
  );
}
