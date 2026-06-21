"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { setDisposition } from "@/lib/actions/moderation/disposition";
import { addNote } from "@/lib/actions/moderation/note";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ModerationCopy } from "./content";
import type { Reason } from "./shared";

export function ModerationPanel({
  submissionId,
  reasons,
  canDisposition,
  canNote,
  copy,
}: {
  submissionId: string;
  reasons: Reason[];
  canDisposition: boolean;
  canNote: boolean;
  copy: ModerationCopy;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [dispNote, setDispNote] = useState("");
  const [note, setNote] = useState("");
  const [confirmReject, setConfirmReject] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  const mapError = (code: string) => copy.errors[code] ?? copy.errors.generic;

  function onApprove() {
    setError(null);
    startTransition(async () => {
      const res = await setDisposition({
        submissionId,
        action: "approve",
        note: dispNote.trim() || null,
      });
      if (!res.ok) {
        setError(mapError(res.error));
        return;
      }
      router.push("/admin/moderation");
    });
  }

  function onReject() {
    setError(null);
    if (!reason) {
      setError(copy.errors.reason_required);
      return;
    }
    startTransition(async () => {
      const res = await setDisposition({
        submissionId,
        action: "reject",
        reasonCode: reason,
        note: dispNote.trim() || null,
      });
      if (!res.ok) {
        setError(mapError(res.error));
        return;
      }
      router.push("/admin/moderation");
    });
  }

  function onAddNote() {
    setError(null);
    setNoteSaved(false);
    if (!note.trim()) {
      setError(copy.errors.note_required);
      return;
    }
    startTransition(async () => {
      const res = await addNote({ submissionId, note });
      if (!res.ok) {
        setError(mapError(res.error));
        return;
      }
      setNote("");
      setNoteSaved(true);
      router.refresh();
    });
  }

  return (
    <Card className="space-y-6 p-6">
      {canDisposition ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">{copy.panel.dispositionTitle}</h2>

          <div>
            <Label htmlFor="disp-note">{copy.panel.noteOptional}</Label>
            <Textarea
              id="disp-note"
              value={dispNote}
              onChange={(e) => setDispNote(e.target.value)}
              rows={3}
              maxLength={2000}
              className="mt-1.5"
            />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <Button onClick={onApprove} disabled={pending}>
              {copy.panel.approve}
            </Button>

            <div className="flex items-end gap-2">
              <div>
                <Label htmlFor="reason">{copy.panel.reason}</Label>
                <select
                  id="reason"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setConfirmReject(false);
                  }}
                  className="mt-1.5 h-10 rounded-md border border-line bg-surface px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                >
                  <option value="">{copy.panel.reasonPlaceholder}</option>
                  {reasons.map((r) => (
                    <option key={r.reason_code} value={r.reason_code}>
                      {r.reason_code} — {r.description}
                    </option>
                  ))}
                </select>
              </div>

              {!confirmReject ? (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => setConfirmReject(true)}
                  disabled={pending}
                >
                  {copy.panel.reject}
                </Button>
              ) : (
                <Button type="button" variant="danger" onClick={onReject} disabled={pending}>
                  {copy.panel.confirmReject}
                </Button>
              )}
            </div>
          </div>

          <p className="text-xs text-ink-soft">{copy.panel.rejectHint}</p>
        </div>
      ) : null}

      {canNote ? (
        <div className="space-y-3 border-t border-line pt-6">
          <h2 className="text-lg font-semibold text-ink">{copy.panel.addNoteTitle}</h2>
          <Textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setNoteSaved(false);
            }}
            rows={3}
            maxLength={2000}
            placeholder={copy.panel.notePlaceholder}
          />
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" onClick={onAddNote} disabled={pending}>
              {copy.panel.saveNote}
            </Button>
            {noteSaved ? (
              <span className="text-sm text-brand-700">{copy.panel.noteSaved}</span>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </Card>
  );
}
