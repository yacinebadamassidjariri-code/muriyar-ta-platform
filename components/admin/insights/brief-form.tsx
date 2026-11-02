"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BriefDetail } from "@/lib/data/admin/insights";
import { saveBriefAction } from "@/lib/actions/admin/insights";

type Props =
  | { mode: "create" }
  | { mode: "edit"; brief: BriefDetail };

type FieldProps = {
  id: string;
  label: string;
  defaultValue?: string | null;
  required?: boolean;
  placeholder?: string;
  rows?: number;
  hint?: string;
};

function Field({ id, label, defaultValue, required, placeholder, rows = 4, hint }: FieldProps) {
  const isTextarea = rows > 1;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
        {required && <span className="ml-1 text-danger" aria-hidden="true">*</span>}
      </label>
      {hint && <p className="text-xs text-ink-soft">{hint}</p>}
      {isTextarea ? (
        <textarea
          id={id}
          name={id}
          defaultValue={defaultValue ?? ""}
          required={required}
          placeholder={placeholder}
          rows={rows}
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600 disabled:opacity-50"
        />
      ) : (
        <input
          id={id}
          name={id}
          defaultValue={defaultValue ?? ""}
          required={required}
          placeholder={placeholder}
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600 disabled:opacity-50"
        />
      )}
    </div>
  );
}

export function BriefForm(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const brief = props.mode === "edit" ? props.brief : null;

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await saveBriefAction(
        props.mode === "edit" ? brief!.brief_id : null,
        formData,
      );
      if (result.ok) {
        router.push(`/admin/insights/briefs/${result.value.brief_id}`);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          {error}
        </p>
      )}

      <section className="space-y-4 rounded-xl border border-line bg-surface p-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
          Identification
        </h2>
        <Field
          id="title"
          label="Title"
          defaultValue={brief?.title}
          required
          placeholder="e.g. Understanding Barriers to Girls' Education in the Sahel"
          rows={1}
        />
        <Field
          id="subtitle"
          label="Subtitle"
          defaultValue={brief?.subtitle}
          placeholder="Optional subtitle"
          rows={1}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="research_theme"
            label="Research theme"
            defaultValue={brief?.research_theme}
            placeholder="e.g. Girls' Education"
            rows={1}
          />
          <div className="space-y-1">
            <label htmlFor="language_code" className="block text-sm font-semibold text-ink">
              Language
            </label>
            <select
              id="language_code"
              name="language_code"
              defaultValue={brief?.language_code ?? "en"}
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
            >
              <option value="en">English</option>
              <option value="fr">French</option>
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              name="is_sample"
              defaultChecked={brief?.is_sample ?? false}
              className="rounded"
            />
            Mark as sample / illustrative brief
          </label>
          <p className="ml-5 text-xs text-ink-soft">
            Sample briefs are not commissioned by clients and must remain clearly labeled.
          </p>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-line bg-surface p-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
          Content
        </h2>
        <Field
          id="research_questions"
          label="Research questions"
          defaultValue={brief?.research_questions}
          placeholder="What central questions does this brief address?"
          rows={3}
        />
        <Field
          id="executive_summary"
          label="Executive summary"
          defaultValue={brief?.executive_summary}
          placeholder="Brief overview of the key findings and recommendations."
          rows={5}
        />
        <Field
          id="methodology"
          label="Methodology"
          defaultValue={brief?.methodology}
          placeholder="Describe the research approach, data sources, and analytical methods."
          rows={6}
          hint="Include the scope of any contributor-derived evidence and its limitations."
        />
        <Field
          id="findings"
          label="Findings"
          defaultValue={brief?.findings}
          placeholder="Describe the evidence-based findings."
          rows={8}
          hint="All quotations and paraphrases require human review before inclusion. Do not fabricate evidence or statistics."
        />
        <Field
          id="recommendations"
          label="Recommendations"
          defaultValue={brief?.recommendations}
          placeholder="Actionable program and policy recommendations."
          rows={6}
        />
        <Field
          id="limitations"
          label="Limitations"
          defaultValue={brief?.limitations}
          placeholder="Methodological limitations, data gaps, and scope boundaries."
          rows={4}
          hint="Be transparent about whether sufficient eligible evidence was available."
        />
        <Field
          id="references_text"
          label="References"
          defaultValue={brief?.references_text}
          placeholder="Citations and reference list."
          rows={5}
        />
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center rounded-md bg-plum-700 px-5 text-sm font-semibold text-white hover:bg-plum-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save draft"}
        </button>
      </div>
    </form>
  );
}
