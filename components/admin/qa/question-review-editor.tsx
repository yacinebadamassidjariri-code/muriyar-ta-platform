"use client";

import { useState, useTransition, useMemo, useEffect, type ReactNode } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import type { QaWorkspace } from "@/lib/data/admin/qa";
import type { QaAdminCopy } from "./content";
import {
  setQuestionStateAction,
  saveQuestionAnswerAction,
  publishQuestionAction,
  unpublishQuestionAction,
  updatePublishedQuestionAction,
  saveQuestionDisplayDraftAction,
  assignQuestionAction,
} from "@/lib/actions/admin/qa";

// ─────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────

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
  const colors: Record<string, string> = {
    PUBLISHED: "bg-emerald-50 text-emerald-800 border-emerald-200",
    REJECTED: "bg-red-50 text-red-800 border-red-200",
    ARCHIVED: "bg-stone-100 text-stone-600 border-stone-200",
    PENDING: "bg-amber-50 text-amber-800 border-amber-200",
    ANSWERED: "bg-blue-50 text-blue-800 border-blue-200",
  };
  const color =
    colors[state] ?? "bg-brand-50 text-brand-800 border-brand-200";
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${color}`}
    >
      {map[state] ?? state}
    </span>
  );
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-line py-2 last:border-0">
      <dt className="w-36 shrink-0 text-sm font-semibold text-ink-soft">{label}</dt>
      <dd className="flex-1 text-sm text-ink">{children}</dd>
    </div>
  );
}

function Notice({
  ok,
  text,
}: {
  ok: boolean;
  text: string;
}) {
  return (
    <p
      role={ok ? "status" : "alert"}
      className={`text-sm ${ok ? "text-emerald-700" : "text-danger"}`}
    >
      {text}
    </p>
  );
}

function SectionCard({
  id,
  heading,
  children,
  className,
}: {
  id?: string;
  heading: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className={`rounded-xl border border-line bg-surface p-5 sm:p-6 ${className ?? ""}`}
    >
      <h2
        id={id}
        className="font-display text-xl font-semibold text-ink"
      >
        {heading}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
// Slug auto-suggestion
// ─────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

// ─────────────────────────────────────────────────────────────────
// Main editor
// ─────────────────────────────────────────────────────────────────

interface Props {
  workspace: QaWorkspace;
  copy: QaAdminCopy;
  canReview: boolean;
  canDisposition: boolean;
  canAnswer: boolean;
  canPublish: boolean;
  canEdit: boolean;
  currentUserId: string;
}

type NoticeState = { ok: boolean; text: string } | null;

export function QuestionReviewEditor({
  workspace,
  copy,
  canReview,
  canDisposition,
  canAnswer,
  canPublish,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Local state
  const [state, setState] = useState(workspace.currentState);
  const [assigneeId, setAssigneeId] = useState(
    workspace.assignedModeratorId ?? currentUserId
  );

  // Public question draft
  const [displayDraft, setDisplayDraft] = useState(
    workspace.questionDisplayDraft ?? ""
  );
  const [slug, setSlug] = useState(
    workspace.publishedContent?.slug ?? ""
  );

  // Answer — pre-populate from saved answer if available; sync when workspace refreshes
  const [answerText, setAnswerText] = useState(workspace.savedAnswerText ?? "");

  // When router.refresh() rehydrates the component with an updated savedAnswerText,
  // sync the textarea so it reflects the confirmed persisted answer.
  useEffect(() => {
    setAnswerText(workspace.savedAnswerText ?? "");
  }, [workspace.savedAnswerText]);

  // Edit-published fields
  const [editDisplay, setEditDisplay] = useState(
    workspace.publishedContent?.questionDisplay ?? ""
  );
  const [editAnswer, setEditAnswer] = useState(
    workspace.publishedContent?.answerText ?? ""
  );
  const [editNote, setEditNote] = useState("");

  // Unpublish
  const [unpublishNote, setUnpublishNote] = useState("");

  // Note for transitions that require a reason (REJECTED, NEEDS_EDIT)
  const [transitionNote, setTransitionNote] = useState("");

  // Per-section notices
  const [draftNotice, setDraftNotice] = useState<NoticeState>(null);
  const [answerNotice, setAnswerNotice] = useState<NoticeState>(null);
  const [publishNotice, setPublishNotice] = useState<NoticeState>(null);
  const [unpublishNotice, setUnpublishNotice] = useState<NoticeState>(null);
  const [editNotice, setEditNotice] = useState<NoticeState>(null);
  const [stateNotice, setStateNotice] = useState<NoticeState>(null);
  const [assignNotice, setAssignNotice] = useState<NoticeState>(null);

  // Clear stale notices when the server-side workspace state changes
  // (e.g. after router.refresh() rehydrates the component with new props)
  useEffect(() => {
    setStateNotice(null);
    setPublishNotice(null);
  }, [workspace.currentState]);

  // Derive derived flags from local state
  const isTerminal = ["REJECTED", "ARCHIVED"].includes(state);
  const isPublished = state === "PUBLISHED";
  const canPublishNow = canPublish && state === "ANSWERED";

  // Slug auto-suggest from draft
  const suggestedSlug = useMemo(() => slugify(displayDraft), [displayDraft]);

  function handleSlugSuggest() {
    if (!slug && suggestedSlug) setSlug(suggestedSlug);
  }

  // ── Handlers ───────────────────────────────────────────────────

  function saveDraft() {
    if (!displayDraft.trim()) {
      setDraftNotice({ ok: false, text: copy.publicQuestionRequired });
      return;
    }
    setDraftNotice(null);
    startTransition(async () => {
      const result = await saveQuestionDisplayDraftAction(
        workspace.rawQuestionId,
        displayDraft
      );
      setDraftNotice({
        ok: result.ok,
        text: result.ok
          ? copy.publicQuestionSaved
          : result.error === "forbidden"
          ? copy.forbidden
          : copy.actionFailed,
      });
      if (result.ok) router.refresh();
    });
  }

  function saveAnswer() {
    setAnswerNotice(null);
    startTransition(async () => {
      const result = await saveQuestionAnswerAction(
        workspace.rawQuestionId,
        answerText
      );
      setAnswerNotice({
        ok: result.ok,
        text: result.ok
          ? copy.answerSaved
          : result.error === "forbidden"
          ? copy.forbidden
          : copy.actionFailed,
      });
      if (result.ok) { router.refresh(); }
    });
  }

  const noteRequiredStates = ["REJECTED", "NEEDS_EDIT"];

  function transitionState(newState: string) {
    setStateNotice(null);
    // DB requires a non-empty note for REJECTED and NEEDS_EDIT
    if (noteRequiredStates.includes(newState) && !transitionNote.trim()) {
      setStateNotice({ ok: false, text: copy.noteRequired });
      return;
    }
    startTransition(async () => {
      const result = await setQuestionStateAction(
        workspace.rawQuestionId,
        newState,
        noteRequiredStates.includes(newState) ? transitionNote.trim() : null
      );
      if (result.ok) {
        setState(newState as typeof state);
        setTransitionNote("");
        setStateNotice({ ok: true, text: copy.actionSuccess });
        router.refresh();
      } else {
        const err = result.error as string;
        setStateNotice({
          ok: false,
          text:
            err === "forbidden"
              ? copy.forbidden
              : err === "invalid_transition" || err === "invalid_state"
              ? copy.invalidTransition
              : err === "note_required"
              ? copy.noteRequired
              : err === "answer_required"
              ? copy.answerRequired
              : copy.actionFailed,
        });
      }
    });
  }

  function handlePublish() {
    if (!displayDraft.trim()) {
      setPublishNotice({ ok: false, text: copy.publicQuestionRequired });
      return;
    }
    if (!slug.trim() || slug.length < 3) {
      setPublishNotice({ ok: false, text: copy.slugRequired });
      return;
    }
    const isCritical = workspace.riskLevel === "critical";
    const confirmMsg = isCritical
      ? copy.publishCriticalConfirm
      : copy.publishConfirm;
    if (!window.confirm(confirmMsg)) return;
    setPublishNotice(null);
    startTransition(async () => {
      const result = await publishQuestionAction(
        workspace.rawQuestionId,
        displayDraft,
        slug,
        isCritical
      );
      if (result.ok) {
        setState("PUBLISHED");
        setEditDisplay(displayDraft);
        setPublishNotice({ ok: true, text: copy.published });
        router.refresh();
      } else {
        const errorKey = result.error as string;
        const text =
          errorKey === "forbidden"
            ? copy.forbidden
            : errorKey === "question_not_answered"
            ? copy.whyCannotPublish
            : errorKey === "critical_risk_requires_override"
            ? copy.whyCannotPublishCritical
            : errorKey === "answer_not_found"
            ? copy.answerNotFound
            : copy.actionFailed;
        setPublishNotice({ ok: false, text });
      }
    });
  }

  function handleUnpublish() {
    if (!window.confirm(copy.unpublishConfirm)) return;
    setUnpublishNotice(null);
    startTransition(async () => {
      const result = await unpublishQuestionAction(
        workspace.rawQuestionId,
        unpublishNote || undefined
      );
      if (result.ok) {
        setState("ANSWERED");
        setUnpublishNotice({ ok: true, text: copy.unpublished });
        setUnpublishNote("");
        router.refresh();
      } else {
        setUnpublishNotice({
          ok: false,
          text:
            result.error === "forbidden" ? copy.forbidden : copy.actionFailed,
        });
      }
    });
  }

  function handleSavePublished() {
    if (!editDisplay.trim()) {
      setEditNotice({ ok: false, text: copy.publicQuestionRequired });
      return;
    }
    if (!editAnswer.trim()) {
      setEditNotice({ ok: false, text: copy.actionFailed });
      return;
    }
    setEditNotice(null);
    startTransition(async () => {
      const result = await updatePublishedQuestionAction(
        workspace.rawQuestionId,
        editDisplay,
        editAnswer,
        editNote || undefined
      );
      if (result.ok) {
        setEditNote("");
        setEditNotice({ ok: true, text: copy.publishedSaved });
        router.refresh();
      } else {
        setEditNotice({
          ok: false,
          text:
            result.error === "forbidden" ? copy.forbidden : copy.actionFailed,
        });
      }
    });
  }

  function handleAssign() {
    setAssignNotice(null);
    startTransition(async () => {
      const result = await assignQuestionAction(
        workspace.rawQuestionId,
        assigneeId || null
      );
      if (result.ok) {
        setAssignNotice({ ok: true, text: copy.actionSuccess });
        router.refresh();
      } else {
        setAssignNotice({
          ok: false,
          text:
            result.error === "forbidden" ? copy.forbidden : copy.actionFailed,
        });
      }
    });
  }

  function handleRelease() {
    setAssignNotice(null);
    startTransition(async () => {
      const result = await assignQuestionAction(workspace.rawQuestionId, null);
      if (result.ok) {
        setAssignNotice({ ok: true, text: copy.actionSuccess });
        router.refresh();
      } else {
        setAssignNotice({
          ok: false,
          text:
            result.error === "forbidden" ? copy.forbidden : copy.actionFailed,
        });
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────

  const inputCls =
    "w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-600 disabled:opacity-50";
  const labelCls = "mb-1 block text-sm font-semibold text-ink-soft";
  const primaryBtn =
    "rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50";
  const secondaryBtn =
    "rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-raised disabled:opacity-50";
  const dangerBtn =
    "rounded-lg border border-danger/40 bg-danger/5 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/10 disabled:opacity-50";
  const publishBtn =
    "rounded-lg bg-mt-terracotta px-5 py-2 text-sm font-semibold text-white hover:bg-mt-terracotta-hover disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      {/* ── Main column ─────────────────────────────────────────── */}
      <div className="space-y-6">
        {/* Original question */}
        <SectionCard id="qa-original" heading={copy.originalQuestionHeading}>
          <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {copy.originalQuestionNote}
          </p>
          <p className="whitespace-pre-wrap text-ink">{workspace.questionTextPlain}</p>
          <p className="mt-3 text-xs text-ink-soft">
            {workspace.charCount} {copy.chars}
          </p>
        </SectionCard>

        {/* Public question draft */}
        {!isTerminal && (
          <SectionCard id="qa-public" heading={copy.publicQuestionHeading}>
            <p className="mb-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
              {copy.publicQuestionNote}
            </p>
            <div className="space-y-4">
              <div>
                <label htmlFor="qa-display-draft" className={labelCls}>
                  {copy.publicQuestionLabel}
                  <span className="ml-1 text-xs font-normal text-ink-soft">
                    ({displayDraft.length}/2000)
                  </span>
                </label>
                <textarea
                  id="qa-display-draft"
                  rows={5}
                  maxLength={2000}
                  value={displayDraft}
                  onChange={(e) => setDisplayDraft(e.target.value)}
                  placeholder={copy.publicQuestionPlaceholder}
                  className={inputCls}
                  disabled={pending}
                  onBlur={handleSlugSuggest}
                />
              </div>

              {/* Slug */}
              <div>
                <label htmlFor="qa-slug" className={labelCls}>
                  {copy.slugLabel}
                </label>
                <p className="mb-1 text-xs text-ink-soft">{copy.slugHelp}</p>
                <div className="flex gap-2">
                  <input
                    id="qa-slug"
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder={copy.slugPlaceholder}
                    className={inputCls}
                    maxLength={220}
                    disabled={pending || isPublished}
                  />
                  {!slug && suggestedSlug && !isPublished && (
                    <button
                      type="button"
                      onClick={() => setSlug(suggestedSlug)}
                      className={secondaryBtn + " whitespace-nowrap"}
                      disabled={pending}
                    >
                      Use suggested
                    </button>
                  )}
                </div>
                {slug && (
                  <p className="mt-1 font-mono text-xs text-ink-soft">
                    /ask/browse/q/{slug.replace(/[^a-z0-9-]/gi, "-").toLowerCase()}
                  </p>
                )}
              </div>

              {/* Save draft button */}
              {!isPublished && (
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={saveDraft}
                    className={secondaryBtn}
                    disabled={pending || !displayDraft.trim()}
                  >
                    {copy.publicQuestionSave}
                  </button>
                  {draftNotice && <Notice ok={draftNotice.ok} text={draftNotice.text} />}
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Preview */}
        {(displayDraft.trim() || isPublished) && (
          <SectionCard id="qa-preview" heading={copy.previewHeading}>
            <p className="mb-4 text-sm text-ink-soft">{copy.previewNote}</p>
            <div className="rounded-xl border border-line bg-canvas p-5">
              <blockquote className="text-base font-semibold italic text-ink">
                {isPublished
                  ? (workspace.publishedContent?.questionDisplay ?? displayDraft)
                  : displayDraft}
              </blockquote>
              {(workspace.publishedContent?.answerText || workspace.savedAnswerText) && (
                <div className="mt-4 border-t border-line pt-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    {workspace.publishedContent?.attributionLabel ?? "Muriyar Ta Team"}
                  </p>
                  <p className="text-sm text-ink">
                    {workspace.publishedContent?.answerText ?? workspace.savedAnswerText}
                  </p>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Answer editor */}
        {canAnswer && !isTerminal && !isPublished && (
          <SectionCard id="qa-answer" heading={copy.answerLabel}>
            <div className="space-y-4">
              {workspace.savedAnswerText && (
                <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  ✓ {copy.answerSaved} {copy.savedAnswerHeading} is shown below — edit and save again to update it.
                </p>
              )}
              <div>
                <textarea
                  rows={10}
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder={copy.answerPlaceholder}
                  className={inputCls}
                  maxLength={10000}
                  disabled={pending}
                />
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={saveAnswer}
                  disabled={pending || !answerText.trim()}
                  className={primaryBtn}
                >
                  {copy.saveAnswer}
                </button>
                {answerNotice && <Notice ok={answerNotice.ok} text={answerNotice.text} />}
              </div>
            </div>
          </SectionCard>
        )}

        {/* Edit published content */}
        {isPublished && canPublish && (
          <SectionCard id="qa-edit-published" heading={copy.editPublishedHeading}>
            <p className="mb-4 rounded-lg bg-stone-50 px-4 py-3 text-sm text-ink-soft">
              {copy.editPublishedNote}
            </p>
            <div className="space-y-4">
              <div>
                <label htmlFor="qa-edit-display" className={labelCls}>
                  {copy.publicQuestionLabel}
                </label>
                <textarea
                  id="qa-edit-display"
                  rows={4}
                  maxLength={2000}
                  value={editDisplay}
                  onChange={(e) => setEditDisplay(e.target.value)}
                  className={inputCls}
                  disabled={pending}
                />
              </div>
              <div>
                <label htmlFor="qa-edit-answer" className={labelCls}>
                  {copy.answerLabel}
                </label>
                <textarea
                  id="qa-edit-answer"
                  rows={8}
                  maxLength={10000}
                  value={editAnswer}
                  onChange={(e) => setEditAnswer(e.target.value)}
                  className={inputCls}
                  disabled={pending}
                />
              </div>
              <div>
                <label htmlFor="qa-edit-note" className={labelCls}>
                  {copy.savePublishedNote}
                </label>
                <input
                  id="qa-edit-note"
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder={copy.savePublishedNotePlaceholder}
                  className={inputCls}
                  maxLength={500}
                  disabled={pending}
                />
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleSavePublished}
                  disabled={pending || !editDisplay.trim() || !editAnswer.trim()}
                  className={primaryBtn}
                >
                  {copy.savePublished}
                </button>
                {editNotice && <Notice ok={editNotice.ok} text={editNotice.text} />}
              </div>
            </div>
          </SectionCard>
        )}

        {/* Unpublish */}
        {isPublished && canPublish && (
          <SectionCard id="qa-unpublish" heading={copy.unpublishHeading}>
            <p className="mb-4 text-sm text-ink-soft">{copy.unpublishNote}</p>
            <div className="space-y-3">
              <div>
                <label htmlFor="qa-unpublish-note" className={labelCls}>
                  {copy.unpublishNoteLabel}
                </label>
                <input
                  id="qa-unpublish-note"
                  type="text"
                  value={unpublishNote}
                  onChange={(e) => setUnpublishNote(e.target.value)}
                  placeholder={copy.unpublishNotePlaceholder}
                  className={inputCls}
                  maxLength={500}
                  disabled={pending}
                />
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleUnpublish}
                  disabled={pending}
                  className={dangerBtn}
                >
                  {copy.unpublishButton}
                </button>
                {unpublishNotice && (
                  <Notice ok={unpublishNotice.ok} text={unpublishNotice.text} />
                )}
              </div>
            </div>
          </SectionCard>
        )}

        {/* Moderation history */}
        <SectionCard id="qa-history" heading={copy.historyHeading}>
          {workspace.history.length === 0 ? (
            <p className="text-sm text-ink-soft">{copy.historyEmpty}</p>
          ) : (
            <ol className="space-y-4">
              {workspace.history.map((entry) => (
                <li
                  key={entry.transitionId}
                  className="border-l-2 border-brand-200 pl-4"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <strong className="text-sm text-ink">{entry.actorName}</strong>
                    <time className="text-xs text-ink-soft">
                      {new Date(entry.createdAt).toLocaleString()}
                    </time>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ink">
                    {entry.fromState} → {entry.toState}
                  </p>
                  {entry.note && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">
                      {entry.note}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </SectionCard>
      </div>

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
        {/* Status + actions card */}
        <div className="rounded-xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-ink">
              {copy.publication}
            </h2>
            <StateChip state={state} copy={copy} />
          </div>

          {/* Escalation badge */}
          {workspace.isEscalated && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
              {copy.escalated}
            </p>
          )}

          {/* Why can't publish (informational) */}
          {!isTerminal && !isPublished && !canPublishNow && canPublish && (
            <p className="mt-3 rounded-lg bg-stone-50 px-3 py-2 text-xs text-ink-soft">
              {workspace.riskLevel === "critical"
                ? copy.whyCannotPublishCritical
                : copy.whyCannotPublish}
            </p>
          )}

          {/* Assignment */}
          {canDisposition && workspace.moderators.length > 0 && (
            <div className="mt-4 space-y-2">
              <label
                htmlFor="qa-assignee"
                className="block text-sm font-semibold text-ink-soft"
              >
                {copy.assignee}
              </label>
              <select
                id="qa-assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="h-9 w-full rounded-md border border-line bg-surface px-2 text-sm"
                disabled={pending}
              >
                {workspace.moderators.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.displayName}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAssign}
                  disabled={pending}
                  className={secondaryBtn + " flex-1"}
                >
                  {copy.assign}
                </button>
                {workspace.assignedModeratorId && (
                  <button
                    type="button"
                    onClick={handleRelease}
                    disabled={pending}
                    className={secondaryBtn}
                  >
                    {copy.release}
                  </button>
                )}
              </div>
              {assignNotice && <Notice ok={assignNotice.ok} text={assignNotice.text} />}
            </div>
          )}

          {/* Note for transitions that require a reason */}
          {canDisposition && !isTerminal && !isPublished && (
            <div className="mt-4">
              <label
                htmlFor="qa-transition-note"
                className="mb-1 block text-xs font-semibold text-ink-soft"
              >
                {copy.rejectReasonLabel}{" "}
                <span className="font-normal text-ink-muted">
                  {copy.rejectReasonOptional}
                </span>
              </label>
              <input
                id="qa-transition-note"
                type="text"
                value={transitionNote}
                onChange={(e) => setTransitionNote(e.target.value)}
                placeholder="e.g. duplicate, off-topic…"
                maxLength={500}
                disabled={pending}
                className="h-8 w-full rounded-md border border-line bg-canvas px-2 text-xs text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-600 disabled:opacity-50"
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-5 space-y-2">
            {/* Approve for review */}
            {canReview && state === "PENDING" && (
              <button
                type="button"
                onClick={() => transitionState("IN_REVIEW")}
                disabled={pending}
                className={secondaryBtn + " w-full text-center"}
              >
                {copy.approveForReview}
              </button>
            )}

            {/* Mark answered */}
            {canAnswer && state === "IN_REVIEW" && (
              <button
                type="button"
                onClick={() => transitionState("ANSWERED")}
                disabled={pending}
                className={secondaryBtn + " w-full text-center"}
              >
                {copy.markAnswered}
              </button>
            )}

            {/* Publish */}
            {canPublishNow && (
              <>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={pending || !displayDraft.trim() || !slug.trim() || !workspace.savedAnswerText}
                  className={publishBtn + " w-full text-center"}
                >
                  {copy.publish}
                </button>
                {!workspace.savedAnswerText && (
                  <p className="text-xs text-danger">
                    {copy.answerNotSaved}
                  </p>
                )}
                {workspace.savedAnswerText && (!displayDraft.trim() || !slug.trim()) && (
                  <p className="text-xs text-ink-soft">
                    {!displayDraft.trim()
                      ? copy.publicQuestionRequired
                      : copy.slugRequired}
                  </p>
                )}
              </>
            )}

            {/* Reject */}
            {canDisposition &&
              !isTerminal &&
              !isPublished &&
              (
                <button
                  type="button"
                  onClick={() => transitionState("REJECTED")}
                  disabled={pending}
                  className={dangerBtn + " w-full text-center"}
                >
                  {copy.rejectQuestion}
                </button>
              )}

            {/* Archive */}
            {canDisposition && !isTerminal && (
              <button
                type="button"
                onClick={() => transitionState("ARCHIVED")}
                disabled={pending}
                className={secondaryBtn + " w-full text-center text-ink-soft"}
              >
                {copy.archiveQuestion}
              </button>
            )}

            {/* Restore */}
            {canDisposition && state === "ARCHIVED" && (
              <button
                type="button"
                onClick={() => transitionState("IN_REVIEW")}
                disabled={pending}
                className={secondaryBtn + " w-full text-center"}
              >
                {copy.restore}
              </button>
            )}
          </div>

          {publishNotice && (
            <div className="mt-3">
              <Notice ok={publishNotice.ok} text={publishNotice.text} />
            </div>
          )}
          {stateNotice && (
            <div className="mt-3">
              <Notice ok={stateNotice.ok} text={stateNotice.text} />
            </div>
          )}
        </div>

        {/* Submission metadata card */}
        <div className="rounded-xl border border-line bg-surface p-5">
          <h2 className="font-display text-lg font-semibold text-ink">
            {copy.questionMeta}
          </h2>
          <dl className="mt-4 divide-y divide-line">
            <MetaRow label={copy.submissionDate}>
              {new Date(workspace.submissionTimestamp).toLocaleDateString()}
            </MetaRow>
            <MetaRow label={copy.consentDate}>
              {new Date(workspace.consentTimestamp).toLocaleDateString()}
            </MetaRow>
            <MetaRow label={copy.columnLanguage}>
              {workspace.languageCode.toUpperCase()}
            </MetaRow>
            <MetaRow label={copy.columnLength}>
              {workspace.charCount} {copy.chars}
            </MetaRow>
            {workspace.topicSlug && (
              <MetaRow label={copy.topicLabel}>{workspace.topicSlug}</MetaRow>
            )}
            {workspace.followUpTo && (
              <MetaRow label={copy.followUpTo}>
                <span className="font-mono text-xs">
                  {workspace.followUpTo.slice(0, 8)}
                </span>
              </MetaRow>
            )}
            <MetaRow label={copy.riskLevel}>{workspace.riskLevel}</MetaRow>
            {workspace.riskFlags.length > 0 && (
              <MetaRow label={copy.riskFlags}>
                {workspace.riskFlags.join(", ")}
              </MetaRow>
            )}
            {workspace.moderationNotes && (
              <MetaRow label={copy.moderationNotes}>
                {workspace.moderationNotes}
              </MetaRow>
            )}
            {workspace.rejectionReasonCode && (
              <MetaRow label={copy.rejectReasonLabel}>
                {workspace.rejectionReasonCode}
              </MetaRow>
            )}
          </dl>
        </div>

        {/* Published info card */}
        {isPublished && workspace.publishedContent && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5">
            <h2 className="font-display text-lg font-semibold text-emerald-800">
              {copy.statePublished}
            </h2>
            <p className="mt-2 font-mono text-xs text-ink-soft">
              /ask/browse/q/{workspace.publishedContent.slug}
            </p>
            <p className="mt-2 text-xs text-ink-soft">
              {new Date(workspace.publishedContent.publishedAt).toLocaleString()}
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
