"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  FileAudio,
  Loader2,
  Music2,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/admin/podcast/inline-error";
import { mediaRequestUploadAction } from "@/lib/actions/podcast/media-request-upload";
import { mediaFinalizeUploadAction } from "@/lib/actions/podcast/media-finalize-upload";
import { mediaDeleteAction } from "@/lib/actions/podcast/media-delete";
import { mediaGetSignedPreviewUrl } from "@/lib/actions/podcast/media-preview-url";

/**
 * Client-side rules for audio uploads. The RPC in M3 will re-validate.
 *
 * Note: browsers report M4A files as either `audio/mp4` (Chrome/Safari)
 * or `audio/x-m4a` (Firefox). The RPC currently accepts `audio/mp4` only,
 * so we accept both in the picker and normalize x-m4a → mp4 before we
 * request the upload URL.
 */
const ACCEPT_MIME_UI = [
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
] as const;
const ACCEPT_ATTR = ACCEPT_MIME_UI.join(",");
const MAX_BYTES = 250 * 1024 * 1024; // 250 MB
const MAX_DURATION_SECONDS = 86400; // matches M3's podcast_invalid_duration bound

/** Normalize the browser-reported mime type into what the RPC accepts. */
function normalizeMime(reported: string): string {
  if (reported === "audio/x-m4a") return "audio/mp4";
  return reported;
}

type AudioAsset = {
  assetId: string;
  originalFilename: string | null;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number | null;
  uploadedAt: string;
};

type Labels = {
  sectionTitle: string;
  sectionSubtitle: string;
  emptyTitle: string;
  emptyBody: string;
  uploadButton: string;
  replaceButton: string;
  deleteButton: string;
  uploadingLabel: string;
  finalizingLabel: string;
  probingLabel: string;
  loadingPreviewLabel: string;
  filenameLabel: string;
  durationLabel: string;
  sizeLabel: string;
  uploadedAtLabel: string;
  confirmDeleteTitle: string;
  confirmDeleteBody: string;
  confirmDelete: string;
  cancel: string;
  acceptedFormats: string;
  maxSize: string;
  errors: {
    invalidType: string;
    tooLarge: string;
    uploadFailed: string;
    rpc_error: string;
    forbidden: string;
    not_found: string;
    podcast_invalid_kind: string;
    podcast_invalid_mime: string;
    podcast_invalid_size: string;
    podcast_not_editable: string;
    podcast_asset_not_uploading: string;
    podcast_invalid_duration: string;
    wrong_asset_kind: string;
  };
};

type Props = {
  episodeId: string;
  initialAsset: AudioAsset | null;
  labels: Labels;
};

type UiState =
  | { phase: "idle" }
  | { phase: "validating" }
  | { phase: "uploading"; progress: number }
  | { phase: "probing" }
  | { phase: "finalizing" };

export function AudioSection({ episodeId, initialAsset, labels }: Props) {
  const [asset, setAsset] = useState<AudioAsset | null>(initialAsset);
  const [ui, setUi] = useState<UiState>({ phase: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isPendingDelete, startDeleteTransition] = useTransition();

  const busy =
    ui.phase !== "idle" || isPendingDelete || confirmingDelete || previewLoading;

  // Fetch a signed preview URL whenever the underlying asset changes.
  useEffect(() => {
    let cancelled = false;
    setPreviewUrl(null);
    if (!asset) return;

    setPreviewLoading(true);
    (async () => {
      const result = await mediaGetSignedPreviewUrl({ assetId: asset.assetId });
      if (cancelled) return;
      if (result.ok) {
        setPreviewUrl(result.value.signedUrl);
      } else {
        setPreviewUrl(null);
      }
      setPreviewLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [asset?.assetId]);

  function openFilePicker() {
    setError(null);
    fileInputRef.current?.click();
  }

  function friendlyError(code: string): string {
    return (
      (labels.errors as Record<string, string | undefined>)[code] ??
      labels.errors.rpc_error
    );
  }

  async function handleFileSelected(file: File) {
    setError(null);
    setUi({ phase: "validating" });

    // Type + size validation before any network.
    const isKnown = (ACCEPT_MIME_UI as readonly string[]).includes(file.type);
    if (!isKnown) {
      setUi({ phase: "idle" });
      setError(labels.errors.invalidType);
      return;
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      setUi({ phase: "idle" });
      setError(labels.errors.tooLarge);
      return;
    }

    const rpcMime = normalizeMime(file.type);

    // 1) Request signed upload URL.
    const request = await mediaRequestUploadAction({
      episodeId,
      kind: "audio",
      mimeType: rpcMime,
      sizeBytes: file.size,
      originalFilename: file.name,
    });
    if (!request.ok) {
      setUi({ phase: "idle" });
      setError(friendlyError(request.error));
      return;
    }
    const { signedUploadUrl, assetId } = request.value;

    // 2) Direct-to-Storage PUT with progress.
    setUi({ phase: "uploading", progress: 0 });
    try {
      await putWithProgress(signedUploadUrl, file, rpcMime, (p) =>
        setUi({ phase: "uploading", progress: p }),
      );
    } catch {
      setUi({ phase: "idle" });
      setError(labels.errors.uploadFailed);
      return;
    }

    // 3) Ask the server for a preview URL for THIS asset, then extract
    //    duration in the browser via a hidden <audio> loadedmetadata.
    setUi({ phase: "probing" });
    let durationSeconds: number | null = null;
    const preview = await mediaGetSignedPreviewUrl({ assetId });
    if (preview.ok) {
      const captured = await probeAudioDuration(preview.value.signedUrl);
      if (
        captured != null &&
        Number.isFinite(captured) &&
        captured > 0 &&
        captured <= MAX_DURATION_SECONDS
      ) {
        durationSeconds = Math.round(captured);
      }
      // Optimistically show the preview immediately.
      setPreviewUrl(preview.value.signedUrl);
    }

    // 4) Finalize on the server.
    setUi({ phase: "finalizing" });
    const finalize = await mediaFinalizeUploadAction({
      episodeId,
      assetId,
      durationSeconds,
    });
    if (!finalize.ok) {
      setUi({ phase: "idle" });
      setError(friendlyError(finalize.error));
      return;
    }

    setAsset({
      assetId,
      originalFilename: file.name,
      mimeType: rpcMime,
      sizeBytes: file.size,
      durationSeconds:
        finalize.value.durationSeconds ?? durationSeconds ?? null,
      uploadedAt: new Date().toISOString(),
    });
    setUi({ phase: "idle" });
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    void handleFileSelected(file);
  }

  function handleDelete() {
    setError(null);
    setConfirmingDelete(false);
    startDeleteTransition(async () => {
      const result = await mediaDeleteAction({ episodeId, kind: "audio" });
      if (!result.ok) {
        setError(friendlyError(result.error));
        return;
      }
      setAsset(null);
      setPreviewUrl(null);
    });
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">
            {labels.sectionTitle}
          </h2>
          <p className="mt-0.5 text-sm text-ink-soft">
            {labels.sectionSubtitle}
          </p>
        </div>
      </div>

      {error ? (
        <div className="mt-4">
          <InlineError>{error}</InlineError>
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_ATTR}
        onChange={onInputChange}
        disabled={busy}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />

      {!asset ? (
        <EmptyState
          labels={labels}
          onUpload={openFilePicker}
          busy={busy}
          ui={ui}
        />
      ) : (
        <ReadyState
          asset={asset}
          previewUrl={previewUrl}
          previewLoading={previewLoading}
          labels={labels}
          onReplace={openFilePicker}
          onDelete={() => setConfirmingDelete(true)}
          busy={busy}
          ui={ui}
        />
      )}

      {confirmingDelete ? (
        <DeleteConfirm
          labels={labels}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={handleDelete}
          busy={isPendingDelete}
        />
      ) : null}
    </Card>
  );
}

// --- Sub-views -----------------------------------------------------------

function EmptyState({
  labels,
  onUpload,
  busy,
  ui,
}: {
  labels: Labels;
  onUpload: () => void;
  busy: boolean;
  ui: UiState;
}) {
  return (
    <div className="mt-4 flex flex-col items-center gap-3 rounded-lg border border-dashed border-line bg-surface-muted/40 p-8 text-center">
      <span
        aria-hidden="true"
        className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700"
      >
        <Music2 className="h-6 w-6" />
      </span>
      <h3 className="text-base font-semibold text-ink">{labels.emptyTitle}</h3>
      <p className="max-w-md text-sm text-ink-soft">{labels.emptyBody}</p>
      <Button type="button" onClick={onUpload} disabled={busy}>
        <UploadIcon ui={ui} fallback={<Upload className="h-4 w-4" />} />
        {phaseLabel(ui, labels) ?? labels.uploadButton}
      </Button>
      <p className="mt-1 text-xs text-ink-soft">
        {labels.acceptedFormats} · {labels.maxSize}
      </p>
      {ui.phase === "uploading" ? (
        <ProgressBar progress={ui.progress} />
      ) : null}
    </div>
  );
}

function ReadyState({
  asset,
  previewUrl,
  previewLoading,
  labels,
  onReplace,
  onDelete,
  busy,
  ui,
}: {
  asset: AudioAsset;
  previewUrl: string | null;
  previewLoading: boolean;
  labels: Labels;
  onReplace: () => void;
  onDelete: () => void;
  busy: boolean;
  ui: UiState;
}) {
  return (
    <div className="mt-4 grid gap-6">
      <dl className="grid gap-y-2 text-sm">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <dt className="font-medium text-ink-soft">{labels.filenameLabel}:</dt>
          <dd className="flex items-center gap-1.5 text-ink">
            <FileAudio className="h-4 w-4 text-ink-soft" aria-hidden="true" />
            {asset.originalFilename ?? "—"}
          </dd>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <dt className="font-medium text-ink-soft">{labels.durationLabel}:</dt>
          <dd className="text-ink">{formatDuration(asset.durationSeconds)}</dd>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <dt className="font-medium text-ink-soft">{labels.sizeLabel}:</dt>
          <dd className="text-ink">{formatBytes(asset.sizeBytes)}</dd>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <dt className="font-medium text-ink-soft">
            {labels.uploadedAtLabel}:
          </dt>
          <dd className="text-ink">{formatDate(asset.uploadedAt)}</dd>
        </div>
      </dl>

      <div className="rounded-lg border border-line bg-surface-muted/40 p-3">
        {previewLoading ? (
          <div className="flex h-12 items-center gap-2 text-ink-soft">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span className="text-sm">{labels.loadingPreviewLabel}</span>
          </div>
        ) : previewUrl ? (
          <audio
            src={previewUrl}
            controls
            preload="metadata"
            className="w-full"
            aria-label={asset.originalFilename ?? "Audio preview"}
          />
        ) : (
          <div className="flex h-12 items-center gap-2 text-ink-soft">
            <FileAudio className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm">—</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onReplace}
          disabled={busy}
        >
          <UploadIcon ui={ui} fallback={<RefreshCw className="h-4 w-4" />} />
          {phaseLabel(ui, labels) ?? labels.replaceButton}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onDelete}
          disabled={busy}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {labels.deleteButton}
        </Button>
      </div>

      {ui.phase === "uploading" ? (
        <ProgressBar progress={ui.progress} />
      ) : null}
    </div>
  );
}

function DeleteConfirm({
  labels,
  onCancel,
  onConfirm,
  busy,
}: {
  labels: Labels;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  return (
    <div
      role="alertdialog"
      aria-modal="false"
      aria-labelledby="audio-delete-title"
      aria-describedby="audio-delete-body"
      className="mt-4 rounded-lg border border-danger/30 bg-danger/5 p-4"
    >
      <h3 id="audio-delete-title" className="text-sm font-semibold text-danger">
        {labels.confirmDeleteTitle}
      </h3>
      <p id="audio-delete-body" className="mt-1 text-sm text-ink">
        {labels.confirmDeleteBody}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={busy}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          {labels.cancel}
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="bg-danger text-white hover:bg-danger/90"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          )}
          {labels.confirmDelete}
        </Button>
      </div>
    </div>
  );
}

function UploadIcon({
  ui,
  fallback,
}: {
  ui: UiState;
  fallback: React.ReactNode;
}) {
  if (
    ui.phase === "uploading" ||
    ui.phase === "probing" ||
    ui.phase === "finalizing"
  ) {
    return <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />;
  }
  return <>{fallback}</>;
}

function ProgressBar({ progress }: { progress: number }) {
  const clamped = Math.max(0, Math.min(100, progress));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className="h-2 w-full overflow-hidden rounded-full bg-surface-muted"
    >
      <div
        className="h-full bg-brand-600 transition-[width] duration-200"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

// --- Utilities ------------------------------------------------------------

function phaseLabel(ui: UiState, labels: Labels): string | null {
  if (ui.phase === "uploading") {
    return `${labels.uploadingLabel} ${Math.round(ui.progress)}%`;
  }
  if (ui.phase === "probing") return labels.probingLabel;
  if (ui.phase === "finalizing") return labels.finalizingLabel;
  if (ui.phase === "validating") return labels.uploadingLabel;
  return null;
}

function putWithProgress(
  url: string,
  file: File,
  contentType: string,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.setRequestHeader("x-upsert", "true");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress((e.loaded / e.total) * 100);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed: HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed: network error"));
    xhr.onabort = () => reject(new Error("Upload aborted"));

    xhr.send(file);
  });
}

/**
 * Ask the browser to load enough of the file to report `duration`. Uses
 * `preload="metadata"` so we don't fetch the full audio.
 *
 * Returns null on any failure — finalize will proceed with durationSeconds=null,
 * which the RPC accepts and the editor can revisit later.
 */
function probeAudioDuration(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    const cleanup = () => {
      audio.onloadedmetadata = null;
      audio.onerror = null;
      audio.src = "";
    };
    const timeout = window.setTimeout(() => {
      cleanup();
      resolve(null);
    }, 10000); // 10-second cap so a bad file can't hang the UI
    audio.onloadedmetadata = () => {
      window.clearTimeout(timeout);
      const d = audio.duration;
      cleanup();
      resolve(Number.isFinite(d) ? d : null);
    };
    audio.onerror = () => {
      window.clearTimeout(timeout);
      cleanup();
      resolve(null);
    };
    audio.src = url;
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return "—";
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return iso;
  }
}