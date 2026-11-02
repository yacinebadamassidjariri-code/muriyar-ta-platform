import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guards";
import { getOrganization } from "@/lib/data/admin/partnerships";
import { saveOrganizationAction } from "@/lib/actions/admin/partnerships";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; orgId: string }>;
}): Promise<Metadata> {
  const { orgId } = await params;
  const result = await getOrganization(orgId);
  return { title: result.ok ? `Edit: ${result.value.name}` : "Edit Organization" };
}

const ORG_STATUSES = ["PROSPECT", "ACTIVE", "PAUSED", "INACTIVE", "ARCHIVED"] as const;

export default async function EditOrganizationPage({
  params,
}: {
  params: Promise<{ locale: string; orgId: string }>;
}) {
  const { locale, orgId } = await params;
  setRequestLocale(locale);
  await requirePermission("commercial.edit");

  const orgResult = await getOrganization(orgId);
  if (!orgResult.ok) notFound();
  const org = (orgResult as { ok: true; value: import("@/lib/data/admin/partnerships").OrgDetail }).value;

  async function updateOrg(formData: FormData) {
    "use server";
    const result = await saveOrganizationAction(orgId, formData);
    if (result.ok) {
      redirect(`/admin/partnerships/organizations/${orgId}`);
    }
  }

  const areasValue = org.areas_of_interest?.join(", ") ?? "";

  return (
    <div className="space-y-6">
      <header>
        <a
          href={`/admin/partnerships/organizations/${orgId}`}
          className="text-xs font-semibold text-plum-700 hover:underline"
        >
          ← {org.name}
        </a>
        <h1 className="mt-1 font-display text-4xl font-semibold text-ink">
          Edit Organization
        </h1>
      </header>

      <form action={updateOrg} className="space-y-6 max-w-2xl">
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
              defaultValue={org.name}
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
                defaultValue={org.org_type ?? ""}
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
                defaultValue={org.country ?? ""}
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
              defaultValue={org.geographic_focus ?? ""}
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
              defaultValue={org.website ?? ""}
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
              defaultValue={areasValue}
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
                defaultValue={org.partnership_status}
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
                defaultValue={org.next_followup_date ?? ""}
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
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
            rows={5}
            defaultValue={org.internal_notes ?? ""}
            placeholder="Context, relationship history, relationship owner…"
            className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
          />
        </section>

        <div className="flex gap-3">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-plum-700 px-6 text-sm font-semibold text-white hover:bg-plum-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
          >
            Save changes
          </button>
          <a
            href={`/admin/partnerships/organizations/${orgId}`}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-surface px-6 text-sm font-semibold text-ink hover:bg-plum-50"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
