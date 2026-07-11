"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  Image as ImageIcon,
  Loader2,
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
 * Client-side rules (tighter than the RPC's server-side rules).
 *
 * The RPC in M3 accepts JPEG/PNG/WebP up to 10 MB and does NOT enforce
 * square. The UI enforces the following stricter rules per Phase 2A M5
 * instructions; if you loosen these here, the RPC will still accept.
 */
const ACCEPT_MIME = ["image/jpeg", "image/png"] as const;
const ACCEPT_ATTR = ACCEPT_MIME.join(",");
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

type ArtworkAsset = {
  assetId: string;
  originalFilename: string | null;
  mimeType: string;
  sizeBytes: number;
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
  loadingPreviewLabel: string;
  filenameLabel: string;
  sizeLabel: string;
  uploadedAtLabel: string;
  confirmDeleteTitle: string;
  confirmDeleteBody: string;
  confirmDelete: string;
  cancel: string;
  acceptedFormats: string;
  maxSize: string;
  squareOnly: string;
  errors: {
    invalidType: string;
    tooLarge: string;
    notSquare: string;
    decodeFailed: string;
    uploadFailed: string;
    rpc_error: string;
    forbidden: string;
    not_found: string;
    podcast_invalid_kind: string;
    podcast_invalid_mime: string;
    podcast_invalid_size: string;
    podcast_not_editable: string;
    podcast_asset_not_uploading: string;
    wrong_asset_kind: string;
  };
};

type Props = {
  episodeId: string;
  initialAsset: ArtworkAsset | null;
  labels: Labels;
};

type UiState =
  | { phase: "idle" }
  | { phase: "validating" }
  | { phase: "uploading"; progress: number }
  | { phase: "finalizing" };

export function ArtworkSection({ episodeId, initialAsset, labels }: Props) {
  const [asset, setAsset] = useState<ArtworkAsset | null>(initialAsset);
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
        // Non-fatal: show the metadata card without an image.
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

  async function validateSquare(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img.naturalWidth === img.naturalHeight);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(false);
      };
      img.src = url;
    });
  }

  async function handleFileSelected(file: File) {
    setError(null);

    // Client-side validation, before any network activity.
    setUi({ phase: "validating" });
    if (!ACCEPT_MIME.includes(file.type as (typeof ACCEPT_MIME)[number])) {
      setUi({ phase: "idle" });
      setError(labels.errors.invalidType);
      return;
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      setUi({ phase: "idle" });
      setError(labels.errors.tooLarge);
      return;
    }
    const isSquare = await validateSquare(file);
    if (!isSquare) {
      setUi({ phase: "idle" });
      setError(labels.errors.notSquare);
      return;
    }

    // 1) Request the signed upload URL from our server action.
    const request = await mediaRequestUploadAction({
      episodeId,
      kind: "artwork",
      mimeType: file.type,
      sizeBytes: file.size,
      originalFilename: file.name,
    });
    if (!request.ok) {
      setUi({ phase: "idle" });
      setError(friendlyError(request.error));
      return;
    }
    const { signedUploadUrl, assetId } = request.value;

    // 2) PUT the file directly to Supabase Storage using the signed URL.
    //    Using XHR (rather than fetch) so we can report progress.
    setUi({ phase: "uploading", progress: 0 });
    try {
      await putWithProgress(signedUploadUrl, file, (p) =>
        setUi({ phase: "uploading", progress: p }),
      );
    } catch {
      setUi({ phase: "idle" });
      setError(labels.errors.uploadFailed);
      return;
    }

    // 3) Finalize on the server (flips asset to 'ready' and points episode
    //    at it). No duration for artwork.
    setUi({ phase: "finalizing" });
    const finalize = await mediaFinalizeUploadAction({
      episodeId,
      assetId,
      durationSeconds: null,
    });
    if (!finalize.ok) {
      setUi({ phase: "idle" });
      setError(friendlyError(finalize.error));
      return;
    }

    setAsset({
      assetId,
      originalFilename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
    });
    setUi({ phase: "idle" });
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the input so selecting the same file again fires change.
    e.target.value = "";
    if (!file) return;
    void handleFileSelected(file);
  }

  function handleDelete() {
    setError(null);
    setConfirmingDelete(false);
    startDeleteTransition(async () => {
      const result = await mediaDeleteAction({ episodeId, kind: "artwork" });
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

      {/* File input, always present. */}
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

      {/* States */}
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

      {/* Delete confirmation */}
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
        <ImageIcon className="h-6 w-6" />
      </span>
      <h3 className="text-base font-semibold text-ink">{labels.emptyTitle}</h3>
      <p className="max-w-md text-sm text-ink-soft">{labels.emptyBody}</p>
      <Button type="button" onClick={onUpload} disabled={busy}>
        <UploadIcon ui={ui} fallback={<Upload className="h-4 w-4" />} />
        {ui.phase === "uploading"
          ? `${labels.uploadingLabel} ${Math.round(ui.progress)}%`
          : ui.phase === "finalizing"
            ? labels.finalizingLabel
            : ui.phase === "validating"
              ? labels.uploadingLabel
              : labels.uploadButton}
      </Button>
      <p className="mt-1 text-xs text-ink-soft">
        {labels.acceptedFormats} · {labels.maxSize} · {labels.squareOnly}
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
  asset: ArtworkAsset;
  previewUrl: string | null;
  previewLoading: boolean;
  labels: Labels;
  onReplace: () => void;
  onDelete: () => void;
  busy: boolean;
  ui: UiState;
}) {
  return (
    <div className="mt-4 grid gap-6 md:grid-cols-[240px_1fr]">
      <div>
        <div className="aspect-square w-full overflow-hidden rounded-lg border border-line bg-surface-muted">
          {previewLoading ? (
            <div className="flex h-full w-full items-center justify-center text-ink-soft">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              <span className="sr-only">{labels.loadingPreviewLabel}</span>
            </div>
          ) : previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-ink-soft">
              <ImageIcon className="h-8 w-8" aria-hidden="true" />
            </div>
          )}
        </div>
      </div>

      <dl className="grid gap-y-2 text-sm">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <dt className="font-medium text-ink-soft">{labels.filenameLabel}:</dt>
          <dd className="text-ink">{asset.originalFilename ?? "—"}</dd>
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

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onReplace}
            disabled={busy}
          >
            <UploadIcon ui={ui} fallback={<RefreshCw className="h-4 w-4" />} />
            {ui.phase === "uploading"
              ? `${labels.uploadingLabel} ${Math.round(ui.progress)}%`
              : ui.phase === "finalizing"
                ? labels.finalizingLabel
                : labels.replaceButton}
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
          <div className="mt-3">
            <ProgressBar progress={ui.progress} />
          </div>
        ) : null}
      </dl>
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
      aria-labelledby="artwork-delete-title"
      aria-describedby="artwork-delete-body"
      className="mt-4 rounded-lg border border-danger/30 bg-danger/5 p-4"
    >
      <h3
        id="artwork-delete-title"
        className="text-sm font-semibold text-danger"
      >
        {labels.confirmDeleteTitle}
      </h3>
      <p id="artwork-delete-body" className="mt-1 text-sm text-ink">
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
  if (ui.phase === "uploading" || ui.phase === "finalizing") {
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

function putWithProgress(
  url: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    // Some Supabase signed upload URLs require this header to prevent
    // overwriting a filled slot; the signed URL itself is single-use.
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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