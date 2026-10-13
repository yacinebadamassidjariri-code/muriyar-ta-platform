"use client";

import { useActionState, useTransition } from "react";
import type { QaWorkspace } from "@/lib/data/admin/qa";
import type { QaAdminCopy } from "./content";
import {
  setQuestionStateAction,
  saveQuestionAnswerAction,
  publishQuestionAction,
} from "@/lib/actions/admin/qa";
import type { QaActionResult } from "@/lib/actions/admin/qa";

interface Props {
  workspace: QaWorkspace;
  copy: QaAdminCopy;
  canReview: boolean;
  canDisposition: boolean;
  canAnswer: boolean;
  canPublish: boolean;
}

const INITIAL: QaActionResult = { ok: true };

function MetaRow({ label, children }: { label: string; children: unknown }) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-line py-2 last:border-0">
      <dt className="w-40 shrink-0 text-sm font-semibold text-ink-soft">{label}</dt>
      <dd className="flex-1 text-sm text-ink">{children}</dd>
    </div>
  );
}

function StateChip({ state, copy }: { state: string; copy: QaAdminCopy }) {
  const map: Record<string, string> = {
    PENDING: copy.statePending,
    ASSIGNED: copy.stateAssigned,
    IN_REVIEW: copy.stateInReview,
    NEEDS_EDIT: copy.stateNeedsEdit,
    ANSWERED: copy.stateAnswered,
    PUBLISHED: copy.statePublished,
    REJECTED: copy.stateRejected,
    ARCHIVED: copy.stateArchived,
  };
  return (
    <span className="inline-block rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-800">
      {map[state] ?? state}
    </span>
  );
}

export function QuestionReviewEditor({
  workspace,
  copy,
  canReview,
  canDisposition,
  canAnswer,
  canPublish,
}: Props) {
  const [answerResult, answerDispatch] = useActionState<QaActionResult, FormData>(
    async (_prev, fd) => {
      const text = fd.get("answer_text") as string | null;
      return saveQuestionAnswerAction(workspace.rawQuestionId, text ?? "");
    },
    INITIAL
  );

  const [stateResult, setStateDispatch] = useActionState<QaActionResult, FormData>(
    async (_prev, fd) => {
      const newState = fd.get("new_state") as string | null;
      const reasonCode = fd.get("reason_code") as string | null;
      return setQuestionStateAction(
        workspace.rawQuestionId,
        newState ?? "",
        reasonCode || null
      );
    },
    INITIAL
  );

  const [publishResult, publishDispatch] = useActionState<QaActionResult, FormData>(
    async (_prev, _fd) => publishQuestionAction(workspace.rawQuestionId),
    INITIAL
  );

  const [, startTransition] = useTransition();

  const isTerminal =
    workspace.currentState === "PUBLISHED" ||
    workspace.currentState === "REJECTED" ||
    workspace.currentState === "ARCHIVED";

  const canPublishNow =
    canPublish &&
    (workspace.currentState === "ANSWERED" || workspace.currentState === "IN_REVIEW");

  function handlePublish() {
    if (!confirm(copy.publishConfirm)) return;
    const fd = new FormData();
    startTransition(() => publishDispatch(fd));
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      {/* Main column */}
      <div className="space-y-6">
        {/* Question text */}
        <section className="rounded-xl border border-line bg-surface p-6">
          <h2 className="font-display text-xl font-semibold text-ink">{copy.questionText}</h2>
          <p className="mt-4 whitespace-pre-wrap text-ink">{workspace.questionTextPlain}</p>
          <p className="mt-3 text-xs text-ink-soft">
            {workspace.charCount} {copy.chars}
          </p>
        </section>

        {/* Answer editor */}
        {canAnswer && !isTerminal && workspace.currentState !== "PUBLISHED" && (
          <section className="rounded-xl border border-line bg-surface p-6">
            <h2 className="font-display text-xl font-semibold text-ink">{copy.answerLabel}</h2>
            <form action={answerDispatch} className="mt-4 space-y-4">
              <textarea
                name="answer_text"
                rows={10}
                placeholder={copy.answerPlaceholder}
                className="w-full rounded-lg border border-line bg-canvas p-3 text-sm text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-600"
                maxLength={10000}
                required
              />
              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {copy.saveAnswer}
                </button>
                {answerResult.ok === true && answerResult !== INITIAL && (
                  <p role="status" className="text-sm text-success">
                    {copy.answerSaved}
                  </p>
                )}
                {answerResult.ok === false && (
                  <p role="alert" className="text-sm text-danger">
                    {answerResult.error === "forbidden" ? copy.forbidden : copy.actionFailed}
                  </p>
                )}
              </div>
            </form>
          </section>
        )}

        {/* State transitions */}
        {canDisposition && !isTerminal && (
          <section className="rounded-xl border border-line bg-surface p-6">
            <h2 className="font-display text-xl font-semibold text-ink">
              {copy.rejectReasonLabel}
            </h2>
            <form action={setStateDispatch} className="mt-4 space-y-4">
              <input type="hidden" name="new_state" value="REJECTED" />
              <label className="flex flex-col gap-1 text-sm font-semibold text-ink-soft">
                {copy.rejectReasonLabel} {copy.rejectReasonOptional}
                <input
                  type="text"
                  name="reason_code"
                  maxLength={100}
                  className="mt-1 rounded-lg border border-line bg-canvas px-3 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-600"
                />
              </label>
              <div className="flex flex-wrap gap-3">
                {canReview && workspace.currentState === "PENDING" && (
                  <button
                    type="button"
                    onClick={() => {
                      const fd = new FormData();
                      fd.set("new_state", "IN_REVIEW");
                      startTransition(() => setStateDispatch(fd));
                    }}
                    className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-raised"
                  >
                    {copy.approveForReview}
                  </button>
                )}
                <button
                  type="submit"
                  className="rounded-lg border border-danger/40 bg-danger/5 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/10"
                >
                  {copy.rejectQuestion}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const fd = new FormData();
                    fd.set("new_state", "ARCHIVED");
                    startTransition(() => setStateDispatch(fd));
                  }}
                  className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-surface-raised"
                >
                  {copy.archiveQuestion}
                </button>
              </div>
              {stateResult.ok === false && (
                <p role="alert" className="text-sm text-danger">
                  {stateResult.error === "forbidden" ? copy.forbidden : copy.actionFailed}
                </p>
              )}
              {stateResult.ok === true && stateResult !== INITIAL && (
                <p role="status" className="text-sm text-success">
                  {copy.actionSuccess}
                </p>
              )}
            </form>
          </section>
        )}

        {/* Publish */}
        {canPublishNow && (
          <section className="rounded-xl border border-brand-200 bg-brand-50/20 p-6">
            <div className="flex items-center justify-between gap-4">
              <p className="font-semibold text-ink">{copy.publishQuestion}</p>
              <button
                type="button"
                onClick={handlePublish}
                className="rounded-lg bg-terracotta-600 px-5 py-2 text-sm font-semibold text-white hover:bg-terracotta-700"
              >
                {copy.publishQuestion}
              </button>
            </div>
            {publishResult.ok === false && (
              <p role="alert" className="mt-3 text-sm text-danger">
                {publishResult.error === "forbidden" ? copy.forbidden : copy.actionFailed}
              </p>
            )}
            {publishResult.ok === true && publishResult !== INITIAL && (
              <p role="status" className="mt-3 text-sm text-success">
                {copy.published}
              </p>
            )}
          </section>
        )}
      </div>

      {/* Sidebar */}
      <aside>
        <div className="rounded-xl border border-line bg-surface p-5">
          <h2 className="font-display text-lg font-semibold text-ink">{copy.questionMeta}</h2>
          <dl className="mt-4 divide-y divide-line">
            <MetaRow label={copy.columnState}>
              <StateChip state={workspace.currentState} copy={copy} />
              {workspace.isEscalated && (
                <span className="ml-2 inline-block rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger">
                  {copy.escalated}
                </span>
              )}
            </MetaRow>
            <MetaRow label={copy.columnLanguage}>{workspace.languageCode.toUpperCase()}</MetaRow>
            <MetaRow label={copy.columnLength}>
              {workspace.charCount} {copy.chars}
            </MetaRow>
            {workspace.topicSlug && (
              <MetaRow label={copy.topicLabel}>{workspace.topicSlug}</MetaRow>
            )}
            {workspace.followUpTo && (
              <MetaRow label={copy.followUpTo}>
                <span className="font-mono text-xs">{workspace.followUpTo.slice(0, 8)}</span>
              </MetaRow>
            )}
            <MetaRow label={copy.submissionDate}>
              {new Date(workspace.submissionTimestamp).toLocaleDateString()}
            </MetaRow>
            <MetaRow label={copy.consentDate}>
              {new Date(workspace.consentTimestamp).toLocaleDateString()}
            </MetaRow>
            <MetaRow label={copy.riskLevel}>{workspace.riskLevel}</MetaRow>
            {workspace.riskFlags.length > 0 && (
              <MetaRow label={copy.riskFlags}>{workspace.riskFlags.join(", ")}</MetaRow>
            )}
            {workspace.moderationNotes && (
              <MetaRow label={copy.moderationNotes}>{workspace.moderationNotes}</MetaRow>
            )}
            {workspace.rejectionReasonCode && (
              <MetaRow label={copy.rejectReasonLabel}>{workspace.rejectionReasonCode}</MetaRow>
            )}
          </dl>
        </div>
      </aside>
    </div>
  );
}
