import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guards";
import { saveOrganizationAction } from "@/lib/actions/admin/partnerships";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return { title: "New Organization" };
}

const ORG_STATUSES = ["PROSPECT", "ACTIVE", "PAUSED", "INACTIVE", "ARCHIVED"] as const;

export default async function NewOrganizationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("commercial.edit");

  async function createOrg(formData: FormData) {
    "use server";
    const result = await saveOrganizationAction(null, formData);
    if (result.ok) {
      redirect(`/admin/partnerships/organizations/${result.value.org_id}`);
    }
    // On error, redirect back with a query param (server-side only; client form handles inline errors)
  }

  return (
    <div className="space-y-6">
      <header>
        <a
          href="../organizations"
          className="text-xs font-semibold text-plum-700 hover:underline"
        >
          ← Organizations
        </a>
        <h1 className="mt-1 font-display text-4xl font-semibold text-ink">
          New Organization
        </h1>
      </header>

      <form action={createOrg} className="space-y-6 max-w-2xl">
        {/* Core details */}
        <section className="rounded-xl border border-line bg-surface p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
            Organization details
          </h2>

          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-ink mb-1">
              Name <span className="text-danger" aria-label="required">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g. UNICEF, Plan International"
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="org_type" className="block text-sm font-semibold text-ink mb-1">
                Type
              </label>
              <input
                id="org_type"
                name="org_type"
                type="text"
                placeholder="NGO, UN Agency, Government…"
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              />
            </div>
            <div>
              <label htmlFor="country" className="block text-sm font-semibold text-ink mb-1">
                Country
              </label>
              <input
                id="country"
                name="country"
                type="text"
                placeholder="e.g. Kenya"
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              />
            </div>
          </div>

          <div>
            <label htmlFor="geographic_focus" className="block text-sm font-semibold text-ink mb-1">
              Geographic focus
            </label>
            <input
              id="geographic_focus"
              name="geographic_focus"
              type="text"
              placeholder="e.g. East Africa, Global"
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
            />
          </div>

          <div>
            <label htmlFor="website" className="block text-sm font-semibold text-ink mb-1">
              Website
            </label>
            <input
              id="website"
              name="website"
              type="url"
              placeholder="https://…"
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
            />
          </div>

          <div>
            <label htmlFor="areas_of_interest" className="block text-sm font-semibold text-ink mb-1">
              Areas of interest
            </label>
            <input
              id="areas_of_interest"
              name="areas_of_interest"
              type="text"
              placeholder="girls_education, child_marriage (comma-separated)"
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="partnership_status" className="block text-sm font-semibold text-ink mb-1">
                Partnership status
              </label>
              <select
                id="partnership_status"
                name="partnership_status"
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              >
                {ORG_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="next_followup_date" className="block text-sm font-semibold text-ink mb-1">
                Next follow-up date
              </label>
              <input
                id="next_followup_date"
                name="next_followup_date"
                type="date"
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              />
            </div>
          </div>
        </section>

        {/* Primary contact — PII notice */}
        <section className="rounded-xl border border-line bg-surface p-5 space-y-4">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
              Primary contact
            </h2>
            <p className="mt-1 text-xs text-ink-soft">
              Contact details are stored server-side with full audit logging and are
              not exposed in the admin interface. They are accessible only through
              direct database queries by authorized staff.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="contact_name" className="block text-sm font-semibold text-ink mb-1">
                Full name
              </label>
              <input
                id="contact_name"
                name="contact_name"
                type="text"
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              />
            </div>
            <div>
              <label htmlFor="contact_email" className="block text-sm font-semibold text-ink mb-1">
                Professional email
              </label>
              <input
                id="contact_email"
                name="contact_email"
                type="email"
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              />
            </div>
          </div>
        </section>

        {/* Internal notes */}
        <section className="rounded-xl border border-line bg-surface p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
            Internal notes
          </h2>
          <textarea
            id="internal_notes"
            name="internal_notes"
            rows={4}
            placeholder="Context, relationship history, relationship owner…"
            className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
          />
        </section>

        <div className="flex gap-3">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-plum-700 px-6 text-sm font-semibold text-white hover:bg-plum-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
          >
            Create organization
          </button>
          <a
            href="../organizations"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-surface px-6 text-sm font-semibold text-ink hover:bg-plum-50"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
