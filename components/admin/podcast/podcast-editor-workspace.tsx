"use client";

import type { ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EditorialEditorShell } from "@/components/admin/editorial/editor-shell";
import { EditorialStatusBadge } from "@/components/admin/editorial/editorial-status-badge";
import { EditorialAuditPanel } from "@/components/admin/editorial/audit-panel";
import { useUnsavedChangesWarning } from "@/components/admin/use-unsaved-changes-warning";
import {
  savePodcastEpisodeAction,
  transitionPodcastEpisodeAction,
} from "@/lib/actions/admin/podcast";
import type {
  PodcastLookups,
  PodcastStatus,
  PodcastWorkspace,
} from "@/lib/data/admin/podcast-cms";
import type {
  PodcastChapter,
  PodcastEditorInput,
} from "@/lib/validation/podcast-admin";
import type { PodcastCmsCopy } from "./cms-content";
import { RelationshipPicker } from "./relationship-picker";

const stringValue = (value: unknown) => typeof value === "string" ? value : "";
const numberValue = (value: unknown) => typeof value === "number" ? String(value) : "";
const newChapterId = () => crypto.randomUUID();

type Props = {
  workspace: PodcastWorkspace;
  lookups: PodcastLookups;
  copy: PodcastCmsCopy;
  locale: string;
  series: Array<{ id: string; label: string }>;
  media: ReactNode;
  canPublish: boolean;
};

export function PodcastEditorWorkspace({
  workspace,
  lookups,
  copy,
  locale,
  series,
  media,
  canPublish,
}: Props) {
  const episode = workspace.episode;
  const initial = useMemo<PodcastEditorInput>(() => ({
    episodeId: episode.episode_id,
    title: stringValue(episode.title),
    slug: stringValue(episode.slug),
    description: stringValue(episode.description),
    summary: stringValue(episode.episode_summary),
    languageCode: stringValue(episode.language_code) || "en",
    episodeNumber: numberValue(episode.episode_number),
    seasonNumber: numberValue(episode.season_number),
    seriesSlug: stringValue(episode.series_slug),
    episodeKind: stringValue(episode.episode_kind),
    contentAdvisory: stringValue(episode.content_advisory) || "none",
    featured: Boolean(episode.is_featured),
    artworkAltText: stringValue(episode.artwork_alt_text),
    transcript: workspace.transcript,
    transcriptStatus: stringValue(episode.transcript_status) || "none",
    chapters: (Array.isArray(episode.chapters) ? episode.chapters : []).map(
      (chapter, index) => ({
        id: `${episode.episode_id}-${index}`,
        startSeconds: Number(chapter.start_seconds),
        title: chapter.title,
        description: chapter.description ?? "",
      }),
    ),
    seoTitle: stringValue(episode.seo_title),
    seoDescription: stringValue(episode.seo_description),
    canonicalUrl: stringValue(episode.canonical_url),
    internalNotes: workspace.internalNotes,
    tagIds: workspace.tagIds,
    storyIds: workspace.storyIds,
    resourceIds: workspace.resourceIds,
    reportIds: workspace.reportIds,
  }), [episode, workspace]);
  const [form, setForm] = useState(initial);
  const [savedBaseline, setSavedBaseline] = useState(() => JSON.stringify(initial));
  const [status, setStatus] = useState<PodcastStatus>(episode.status);
  const [scheduleAt, setScheduleAt] = useState(stringValue(episode.scheduled_at).slice(0, 16));
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const transcriptRef = useRef<HTMLTextAreaElement>(null);
  const dirty = JSON.stringify(form) !== savedBaseline;
  useUnsavedChangesWarning(dirty, copy.unsaved);

  const set = <Key extends keyof PodcastEditorInput>(key: Key, value: PodcastEditorInput[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  async function persist(quiet = false) {
    const result = await savePodcastEpisodeAction(form);
    if (!result.ok) {
      setNotice({ ok: false, text: `${copy.error} (${result.requestId})` });
      return false;
    }
    setSavedBaseline(JSON.stringify(form));
    if (!quiet) setNotice({ ok: true, text: copy.saved });
    router.refresh();
    return true;
  }

  async function save(quiet = false) {
    if (pending) return false;
    setPending(true);
    try {
      return await persist(quiet);
    } finally {
      setPending(false);
    }
  }

  async function transition(action: "schedule" | "publish" | "unpublish" | "archive" | "restore") {
    if (pending || (action === "archive" && !window.confirm(copy.confirmArchive))) return;
    const previous = status;
    const next: Record<typeof action, PodcastStatus> = {
      schedule: "scheduled",
      publish: "published",
      unpublish: "draft",
      archive: "archived",
      restore: "draft",
    };
    setStatus(next[action]);
    setPending(true);
    try {
      if ((action === "schedule" || action === "publish") && !(await persist(true))) {
        setStatus(previous);
        return;
      }
      const result = await transitionPodcastEpisodeAction({
        episodeId: form.episodeId,
        action,
        scheduledAt: action === "schedule" ? new Date(scheduleAt).toISOString() : null,
      });
      if (!result.ok) {
        setStatus(previous);
        setNotice({ ok: false, text: `${copy.error}: ${result.error} (${result.requestId})` });
        return;
      }
      setNotice({ ok: true, text: copy.transitionDone });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  function insertTranscript(value: string) {
    const element = transcriptRef.current;
    if (!element) {
      set("transcript", form.transcript + value);
      return;
    }
    const start = element.selectionStart;
    const end = element.selectionEnd;
    set("transcript", form.transcript.slice(0, start) + value + form.transcript.slice(end));
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + value.length, start + value.length);
    });
  }

  function moveChapter(index: number, next: number) {
    if (next < 0 || next >= form.chapters.length) return;
    const chapters = [...form.chapters];
    [chapters[index], chapters[next]] = [chapters[next], chapters[index]];
    set("chapters", chapters);
  }

  function updateChapter(id: string, patch: Partial<PodcastChapter>) {
    set("chapters", form.chapters.map((chapter) => chapter.id === id ? { ...chapter, ...patch } : chapter));
  }

  const panel = "rounded-xl border border-line bg-surface p-5 sm:p-6";
  const label = "mb-1 block text-sm font-semibold text-ink";
  const words = form.transcript.trim() ? form.transcript.trim().split(/\s+/).length : 0;

  const main = <>
    <section className={panel}>
      <h2 className="font-display text-2xl font-semibold">{copy.episodeSection}</h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className={label}>{copy.episode}</span><Input value={form.title} maxLength={200} required onChange={(event) => set("title", event.target.value)} /></label>
        <label><span className={label}>{copy.slug}</span><Input value={form.slug} maxLength={80} pattern="[a-z0-9-]+" onChange={(event) => set("slug", event.target.value)} /></label>
        <label><span className={label}>{copy.language}</span><select className="h-10 w-full rounded-md border border-line bg-surface px-3" value={form.languageCode} onChange={(event) => set("languageCode", event.target.value)}>{lookups.languages.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
        <label><span className={label}>{copy.episodeNumber}</span><Input type="number" min={1} value={form.episodeNumber} onChange={(event) => set("episodeNumber", event.target.value)} /></label>
        <label><span className={label}>{copy.season}</span><Input type="number" min={1} value={form.seasonNumber} onChange={(event) => set("seasonNumber", event.target.value)} /></label>
        <label><span className={label}>{copy.series}</span><select className="h-10 w-full rounded-md border border-line bg-surface px-3" value={form.seriesSlug} onChange={(event) => set("seriesSlug", event.target.value)}><option value="">{copy.none}</option>{series.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
        <label><span className={label}>{copy.kind}</span><select className="h-10 w-full rounded-md border border-line bg-surface px-3" value={form.episodeKind} onChange={(event) => set("episodeKind", event.target.value)}><option value="">{copy.none}</option>{Object.entries(copy.kindLabels).map(([value, option]) => <option key={value} value={value}>{option}</option>)}</select></label>
        <label className="sm:col-span-2"><span className={label}>{copy.description}</span><Textarea rows={4} maxLength={1000} value={form.description} onChange={(event) => set("description", event.target.value)} /></label>
        <label className="sm:col-span-2"><span className={label}>{copy.summary}</span><Textarea rows={6} maxLength={8000} value={form.summary} onChange={(event) => set("summary", event.target.value)} /></label>
      </div>
    </section>
    {media}
    <section className={panel}>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-2xl font-semibold">{copy.transcript}</h2><p className="mt-1 text-sm text-ink-soft">{copy.transcriptHelp}</p></div><p className="text-sm text-ink-soft">{copy.words.replace("{count}", String(words))} · {copy.readingTime.replace("{count}", String(Math.max(1, Math.ceil(words / 220))))}</p></div>
      <div className="mt-4 flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => insertTranscript("[00:00] ")}>{copy.insertTimestamp}</Button><Button type="button" variant="secondary" onClick={() => insertTranscript("Speaker: ")}>{copy.insertSpeaker}</Button><Button type="button" variant="ghost" onClick={() => navigator.clipboard.writeText(form.transcript)}>{copy.copyTranscript}</Button><select aria-label={copy.transcriptComplete} className="h-10 rounded-md border border-line bg-surface px-3" value={form.transcriptStatus} onChange={(event) => set("transcriptStatus", event.target.value)}>{Object.entries(copy.transcriptLabels).map(([value, option]) => <option key={value} value={value}>{option}</option>)}</select></div>
      <label className="mt-4 block"><span className={label}>{copy.transcriptSearch}</span><input type="search" className="h-10 w-full rounded-md border border-line px-3" onChange={(event) => { const search = event.target.value; const found = form.transcript.toLowerCase().indexOf(search.toLowerCase()); if (found >= 0 && search) { transcriptRef.current?.focus(); transcriptRef.current?.setSelectionRange(found, found + search.length); } }} /></label>
      <Textarea ref={transcriptRef} aria-label={copy.transcript} className="mt-4 font-mono text-sm leading-7" rows={24} maxLength={250000} value={form.transcript} onChange={(event) => set("transcript", event.target.value)} />
    </section>
    <section className={panel}>
      <div className="flex items-center justify-between gap-3"><h2 className="font-display text-2xl font-semibold">{copy.chapters}</h2><Button type="button" variant="secondary" onClick={() => set("chapters", [...form.chapters, { id: newChapterId(), startSeconds: 0, title: "", description: "" }])}>{copy.addChapter}</Button></div>
      <div className="mt-5 space-y-3">{form.chapters.map((chapter, index) => <article key={chapter.id} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => moveChapter(Number(event.dataTransfer.getData("text/plain")), index)} className="grid gap-3 rounded-lg border border-line p-4 sm:grid-cols-[8rem_1fr]"><label><span className={label}>{copy.chapterTime}</span><Input type="number" min={0} value={chapter.startSeconds} onChange={(event) => updateChapter(chapter.id, { startSeconds: Number(event.target.value) })} /></label><label><span className={label}>{copy.chapterTitle}</span><Input maxLength={200} value={chapter.title} onChange={(event) => updateChapter(chapter.id, { title: event.target.value })} /></label><label className="sm:col-span-2"><span className={label}>{copy.chapterDescription}</span><Input maxLength={500} value={chapter.description} onChange={(event) => updateChapter(chapter.id, { description: event.target.value })} /></label><div className="flex flex-wrap gap-2 sm:col-span-2"><Button type="button" variant="ghost" onClick={() => moveChapter(index, index - 1)} disabled={index === 0}>{copy.moveUp}</Button><Button type="button" variant="ghost" onClick={() => moveChapter(index, index + 1)} disabled={index === form.chapters.length - 1}>{copy.moveDown}</Button><Button type="button" variant="danger" onClick={() => set("chapters", form.chapters.filter((item) => item.id !== chapter.id))}>{copy.remove}</Button></div></article>)}</div>
    </section>
    <section className={panel}>
      <h2 className="font-display text-2xl font-semibold">{copy.metadata}</h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <label><span className={label}>{copy.artworkAlt}</span><Input maxLength={300} value={form.artworkAltText} onChange={(event) => set("artworkAltText", event.target.value)} /></label>
        <label><span className={label}>{copy.advisory}</span><select className="h-10 w-full rounded-md border border-line bg-surface px-3" value={form.contentAdvisory} onChange={(event) => set("contentAdvisory", event.target.value)}>{Object.entries(copy.advisoryLabels).map(([value, option]) => <option key={value} value={value}>{option}</option>)}</select></label>
        <label className="flex items-center gap-3 rounded-lg border border-line p-3"><input type="checkbox" checked={form.featured} disabled={status !== "published"} onChange={(event) => set("featured", event.target.checked)} /><span><span className="block text-sm font-semibold text-ink">{copy.featured}</span>{status !== "published" ? <span className="block text-xs text-ink-soft">{copy.requiredForPublish}</span> : null}</span></label>
        <label><span className={label}>{copy.seoTitle}</span><Input maxLength={200} value={form.seoTitle} onChange={(event) => set("seoTitle", event.target.value)} /></label>
        <label><span className={label}>{copy.canonicalUrl}</span><Input type="url" maxLength={500} value={form.canonicalUrl} onChange={(event) => set("canonicalUrl", event.target.value)} /></label>
        <label className="sm:col-span-2"><span className={label}>{copy.seoDescription}</span><Textarea maxLength={320} rows={3} value={form.seoDescription} onChange={(event) => set("seoDescription", event.target.value)} /></label>
        <label className="sm:col-span-2"><span className={label}>{copy.internalNotes}</span><span className="mb-2 block text-xs text-ink-soft">{copy.private}</span><Textarea maxLength={10000} rows={5} value={form.internalNotes} onChange={(event) => set("internalNotes", event.target.value)} /></label>
      </div>
    </section>
    <section className={panel}>
      <h2 className="font-display text-2xl font-semibold">{copy.relationships}</h2>
      <div className="mt-5 grid gap-4 lg:grid-cols-2"><RelationshipPicker label={copy.tags} searchLabel={copy.pickerSearch} options={lookups.tags} selected={form.tagIds} onChange={(value) => set("tagIds", value.map(Number))} /><RelationshipPicker label={copy.relatedStories} searchLabel={copy.pickerSearch} options={lookups.stories} selected={form.storyIds} onChange={(value) => set("storyIds", value.map(String))} /><RelationshipPicker label={copy.relatedResources} searchLabel={copy.pickerSearch} options={lookups.resources} selected={form.resourceIds} onChange={(value) => set("resourceIds", value.map(String))} /><RelationshipPicker label={copy.relatedReports} searchLabel={copy.pickerSearch} options={lookups.reports} selected={form.reportIds} onChange={(value) => set("reportIds", value.map(String))} /></div>
    </section>
    <EditorialAuditPanel items={workspace.history} title={copy.audit} empty={copy.auditEmpty} before={copy.before} after={copy.after} locale={locale} />
  </>;

  const sidebar = <section className={panel}>
    <div className="flex items-center justify-between gap-3"><h2 className="font-display text-xl font-semibold">{copy.publication}</h2><EditorialStatusBadge status={status} label={copy.statusLabels[status]} /></div>
    <div className="mt-5 grid gap-2">
      <Button type="button" onClick={() => void save()} disabled={pending} aria-keyshortcuts="Control+S Meta+S">{pending ? copy.saving : copy.save}</Button>
      {canPublish && status === "draft" ? <><label><span className={label}>{copy.scheduleAt}</span><Input type="datetime-local" value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} /></label><Button type="button" variant="secondary" disabled={!scheduleAt || pending} onClick={() => void transition("schedule")}>{copy.schedule}</Button><Button type="button" disabled={pending} onClick={() => void transition("publish")}>{copy.publishNow}</Button></> : null}
      {canPublish && (status === "scheduled" || status === "published") ? <Button type="button" variant="secondary" disabled={pending} onClick={() => void transition("unpublish")}>{copy.unpublish}</Button> : null}
      {canPublish && status !== "archived" ? <Button type="button" variant="ghost" disabled={pending} onClick={() => void transition("archive")}>{copy.archive}</Button> : null}
      {canPublish && status === "archived" ? <Button type="button" variant="secondary" disabled={pending} onClick={() => void transition("restore")}>{copy.restore}</Button> : null}
      <Link className="mt-2 text-center text-sm font-semibold text-brand-700 hover:underline" href={`/admin/podcasts/${form.episodeId}/preview`} target="_blank">{copy.preview}</Link>
    </div>
    <p className="mt-3 text-xs text-ink-soft">{copy.shortcut}</p>
    {notice ? <p role="status" className={`mt-3 text-sm ${notice.ok ? "text-emerald-700" : "text-danger"}`}>{notice.text}</p> : null}
  </section>;

  return <form onSubmit={(event) => { event.preventDefault(); void save(); }} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") { event.preventDefault(); if (!pending) void save(); } }}><EditorialEditorShell main={main} sidebar={sidebar} /></form>;
}
