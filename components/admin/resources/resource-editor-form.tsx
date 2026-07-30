"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { saveResourceAction, transitionResourceAction } from "@/lib/actions/admin/resources";
import type { ResourceAdminDetail, ResourceAdminLookups, ResourceAdminStatus } from "@/lib/data/admin/resources";
import type { ResourceAdminInput } from "@/lib/validation/resource-admin";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { EditorialStatusBadge } from "@/components/admin/editorial/editorial-status-badge";
import { useUnsavedChangesWarning } from "@/components/admin/use-unsaved-changes-warning";
import type { ResourceAdminCopy } from "./content";

function Field({ id, label, error, required, children }: { id: string; label: string; error?: string; required?: boolean; children: ReactNode }) {
  return <div><Label htmlFor={id}>{label}{required ? <span aria-hidden="true"> *</span> : null}</Label><div className="mt-1.5">{children}</div>{error ? <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-danger">{error}</p> : null}</div>;
}

function initialValue(resource: ResourceAdminDetail | null): ResourceAdminInput {
  return {
    resourceId: resource?.resourceId ?? null, name: resource?.name ?? "", description: resource?.description ?? "",
    websiteUrl: resource?.websiteUrl ?? "", phone: resource?.phone ?? "", email: resource?.email ?? "",
    address: resource?.address ?? "", socialLinks: resource?.socialLinks ?? {}, categoryIds: resource?.categoryIds ?? [],
    regionIds: resource?.regionIds ?? [], languageCodes: resource?.languageCodes ?? [], isCrisisResource: resource?.isCrisisResource ?? false,
    editorialPriority: resource?.editorialPriority ?? null, isFeatured: resource?.isFeatured ?? false,
    sortOrder: resource?.sortOrder ?? 0, internalNotes: resource?.internalNotes ?? "",
  };
}

export function ResourceEditorForm({ resource, lookups, copy, canPublish }: {
  resource: ResourceAdminDetail | null; lookups: ResourceAdminLookups; copy: ResourceAdminCopy; canPublish: boolean;
}) {
  const [value, setValue] = useState(() => initialValue(resource));
  const [savedValue, setSavedValue] = useState(() => initialValue(resource));
  const [status, setStatus] = useState<ResourceAdminStatus>(resource?.status ?? "draft");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const isDirty = JSON.stringify(value) !== JSON.stringify(savedValue);
  useUnsavedChangesWarning(isDirty, copy.unsavedWarning);
  const errorText = (code?: string) => code === "required" ? copy.requiredField : code === "invalid_url" ? copy.invalidUrl : code === "invalid_email" ? copy.invalidEmail : code ? copy.tooLong : undefined;
  const setText = (key: keyof ResourceAdminInput) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValue((current) => ({ ...current, [key]: event.target.value }));
  const toggleNumber = (key: "categoryIds" | "regionIds", id: number) => setValue((current) => ({ ...current, [key]: current[key].includes(id) ? current[key].filter((value) => value !== id) : [...current[key], id] }));
  const toggleLanguage = (code: string) => setValue((current) => ({ ...current, languageCodes: current.languageCodes.includes(code) ? current.languageCodes.filter((value) => value !== code) : [...current.languageCodes, code] }));

  function save(event: React.FormEvent) {
    event.preventDefault(); setNotice(null); setErrors({});
    startTransition(async () => {
      const result = await saveResourceAction(value);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setNotice({ ok: false, text: result.error === "conflict" ? copy.duplicateError : result.error === "invalid_input" ? copy.invalidError : `${copy.genericError} (${result.requestId})` });
        return;
      }
      setSavedValue(value);
      setNotice({ ok: true, text: copy.saved });
      if (!value.resourceId && result.resourceId) router.push(`/admin/resources/${result.resourceId}`);
      else router.refresh();
    });
  }

  function transition(action: "publish" | "unpublish" | "archive" | "restore") {
    if (!resource?.resourceId || (action === "archive" && !window.confirm(copy.confirmArchive))) return;
    setNotice(null);
    startTransition(async () => {
      const result = await transitionResourceAction(resource.resourceId, action);
      if (!result.ok) { setNotice({ ok: false, text: `${copy.actionError} (${result.requestId})` }); return; }
      setStatus(action === "publish" ? "published" : action === "archive" ? "archived" : "draft");
      setNotice({ ok: true, text: copy.transitionSuccess }); router.refresh();
    });
  }

  const panel = "rounded-xl border border-line bg-surface p-5 sm:p-6";
  return <form onSubmit={save} onKeyDown={(event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      if (!pending) event.currentTarget.requestSubmit();
    }
  }} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
    <div className="space-y-6">
      <section className={panel} aria-labelledby="resource-basic"><h2 id="resource-basic" className="font-display text-2xl font-semibold text-ink">{copy.basic}</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field id="resource-name" label={copy.organizationLabel} required error={errorText(errors.name)}><Input id="resource-name" value={value.name} onChange={setText("name")} maxLength={200} required aria-invalid={!!errors.name} aria-describedby={errors.name ? "resource-name-error" : undefined} /></Field></div>
          <div className="sm:col-span-2"><Field id="resource-description" label={copy.description} error={errorText(errors.description)}><Textarea id="resource-description" value={value.description} onChange={setText("description")} maxLength={10000} rows={7} aria-invalid={!!errors.description} /></Field></div>
          <Field id="resource-website" label={copy.website} error={errorText(errors.websiteUrl)}><Input id="resource-website" type="url" value={value.websiteUrl} onChange={setText("websiteUrl")} maxLength={500} placeholder="https://" aria-invalid={!!errors.websiteUrl} /></Field>
          <Field id="resource-phone" label={copy.phone} error={errorText(errors.phone)}><Input id="resource-phone" type="tel" value={value.phone} onChange={setText("phone")} maxLength={60} aria-invalid={!!errors.phone} /></Field>
          <Field id="resource-email" label={copy.email} error={errorText(errors.email)}><Input id="resource-email" type="email" value={value.email} onChange={setText("email")} maxLength={200} aria-invalid={!!errors.email} /></Field>
          <Field id="resource-address" label={copy.address} error={errorText(errors.address)}><Input id="resource-address" value={value.address} onChange={setText("address")} maxLength={1000} aria-invalid={!!errors.address} /></Field>
        </div>
      </section>

      <fieldset className={panel}><legend className="font-display text-2xl font-semibold text-ink">{copy.categories}</legend><p className="mt-2 text-sm text-ink-soft">{copy.categoriesHelp}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">{lookups.categories.map((category) => <label key={category.categoryId} className="flex min-h-11 items-center gap-3 rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink"><input type="checkbox" checked={value.categoryIds.includes(category.categoryId)} onChange={() => toggleNumber("categoryIds", category.categoryId)} className="h-4 w-4 accent-brand-600" />{category.name}</label>)}</div>
        {errors.categoryIds ? <p role="alert" className="mt-2 text-sm text-danger">{copy.requiredField}</p> : null}
      </fieldset>

      <section className={panel} aria-labelledby="resource-geography"><h2 id="resource-geography" className="font-display text-2xl font-semibold text-ink">{copy.geographySection}</h2><p className="mt-2 text-sm text-ink-soft">{copy.geographyHelp}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">{lookups.regions.map((region) => <label key={region.regionId} className="flex min-h-11 items-center gap-3 rounded-lg border border-line px-3 py-2 text-sm text-ink"><input type="checkbox" checked={value.regionIds.includes(region.regionId)} onChange={() => toggleNumber("regionIds", region.regionId)} className="h-4 w-4 accent-brand-600" /><span>{region.name}<span className="ml-2 text-xs capitalize text-ink-soft">{region.level}</span></span></label>)}</div>
      </section>

      <fieldset className={panel}><legend className="font-display text-2xl font-semibold text-ink">{copy.languagesSection}</legend><div className="mt-4 grid gap-2 sm:grid-cols-2">{lookups.languages.map((language) => <label key={language.code} className="flex min-h-11 items-center gap-3 rounded-lg border border-line px-3 py-2 text-sm text-ink"><input type="checkbox" checked={value.languageCodes.includes(language.code)} onChange={() => toggleLanguage(language.code)} className="h-4 w-4 accent-brand-600" />{language.name}</label>)}</div></fieldset>

      <section className={panel} aria-labelledby="resource-social"><h2 id="resource-social" className="font-display text-2xl font-semibold text-ink">{copy.social}</h2><div className="mt-5 grid gap-5 sm:grid-cols-2">{(["facebook", "instagram", "linkedin"] as const).map((network) => <Field key={network} id={`resource-${network}`} label={copy[network]} error={errorText(errors[`socialLinks.${network}`])}><Input id={`resource-${network}`} type="url" value={value.socialLinks[network] ?? ""} onChange={(event) => setValue((current) => ({ ...current, socialLinks: { ...current.socialLinks, [network]: event.target.value } }))} maxLength={500} placeholder="https://" aria-invalid={!!errors[`socialLinks.${network}`]} /></Field>)}</div></section>

      <section className={panel} aria-labelledby="resource-editorial"><h2 id="resource-editorial" className="font-display text-2xl font-semibold text-ink">{copy.editorial}</h2><div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Field id="resource-priority" label={copy.priority}><select id="resource-priority" value={value.editorialPriority ?? ""} onChange={(event) => setValue((current) => ({ ...current, editorialPriority: (event.target.value || null) as ResourceAdminInput["editorialPriority"] }))} className="h-10 w-full rounded-md border border-line bg-surface px-3 text-sm"><option value="">{copy.none}</option><option value="high">{copy.high}</option><option value="medium">{copy.medium}</option><option value="low">{copy.low}</option></select></Field>
        <Field id="resource-sort-order" label={copy.sortOrder} error={errorText(errors.sortOrder)}><Input id="resource-sort-order" type="number" min={-100000} max={100000} value={value.sortOrder} onChange={(event) => setValue((current) => ({ ...current, sortOrder: Number(event.target.value) }))} aria-invalid={!!errors.sortOrder} /></Field>
        <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-ink"><input type="checkbox" checked={value.isFeatured} onChange={(event) => setValue((current) => ({ ...current, isFeatured: event.target.checked }))} className="h-4 w-4 accent-brand-600" />{copy.featuredLabel}</label>
        <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-ink"><input type="checkbox" checked={value.isCrisisResource} onChange={(event) => setValue((current) => ({ ...current, isCrisisResource: event.target.checked }))} className="h-4 w-4 accent-brand-600" />{copy.crisisLabel}</label>
        <div className="sm:col-span-2"><Field id="resource-notes" label={copy.internalNotes} error={errorText(errors.internalNotes)}><Textarea id="resource-notes" value={value.internalNotes} onChange={setText("internalNotes")} maxLength={5000} rows={5} aria-invalid={!!errors.internalNotes} /><p className="mt-1 text-sm text-ink-soft">{copy.internalNotesHelp}</p></Field></div>
      </div></section>
    </div>

    <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
      <section className={panel} aria-labelledby="resource-publication"><div className="flex items-center justify-between gap-3"><h2 id="resource-publication" className="font-display text-xl font-semibold text-ink">{copy.publication}</h2><EditorialStatusBadge status={status} label={copy[status]} /></div>
        {resource ? <dl className="mt-4 space-y-2 text-sm"><div><dt className="text-ink-soft">{copy.publishedAt}</dt><dd className="font-medium text-ink">{resource.publishedAt ? new Date(resource.publishedAt).toLocaleString() : copy.notYet}</dd></div><div><dt className="text-ink-soft">{copy.unpublishedAt}</dt><dd className="font-medium text-ink">{resource.unpublishedAt ? new Date(resource.unpublishedAt).toLocaleString() : copy.notYet}</dd></div></dl> : null}
        <div className="mt-5 grid gap-2"><Button type="submit" disabled={pending} aria-keyshortcuts="Control+S Meta+S">{pending ? copy.saving : resource ? copy.saveChanges : copy.saveDraft}</Button>
          {resource && canPublish && status !== "published" ? <Button type="button" variant="secondary" onClick={() => transition("publish")} disabled={pending}>{copy.publish}</Button> : null}
          {resource && canPublish && status === "published" ? <Button type="button" variant="secondary" onClick={() => transition("unpublish")} disabled={pending}>{copy.unpublish}</Button> : null}
          {resource && canPublish && status !== "archived" ? <Button type="button" variant="ghost" onClick={() => transition("archive")} disabled={pending}>{copy.archive}</Button> : null}
          {resource && canPublish && status === "archived" ? <Button type="button" variant="secondary" onClick={() => transition("restore")} disabled={pending}>{copy.restore}</Button> : null}
        </div>
        <p className="mt-3 text-xs text-ink-soft">{copy.saveShortcut}</p>
        {notice ? <p role="status" className={`mt-4 text-sm ${notice.ok ? "text-success-700" : "text-danger"}`}>{notice.text}</p> : null}
      </section>
    </aside>
  </form>;
}
