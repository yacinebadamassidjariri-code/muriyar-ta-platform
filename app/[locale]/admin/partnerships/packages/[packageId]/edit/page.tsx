import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guards";
import { getServicePackage } from "@/lib/data/admin/partnerships";
import { savePackageAction } from "@/lib/actions/admin/partnerships";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; packageId: string }>;
}): Promise<Metadata> {
  const { packageId } = await params;
  const result = await getServicePackage(packageId);
  return { title: result.ok ? `Edit — ${result.value.name}` : "Edit Package" };
}

export default async function EditPackagePage({
  params,
}: {
  params: Promise<{ locale: string; packageId: string }>;
}) {
  const { locale, packageId } = await params;
  setRequestLocale(locale);
  await requirePermission("commercial.edit");

  const result = await getServicePackage(packageId);
  if (!result.ok) notFound();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const pkg = (result as Extract<typeof result, { ok: true }>).value;

  // deliverables is stored as text[] in the DB but displayed as textarea (one per line)
  const deliverablesText = Array.isArray(pkg.deliverables)
    ? (pkg.deliverables as string[]).join("\n")
    : (pkg.deliverables ?? "");

  async function savePackage(formData: FormData) {
    "use server";
    const saveResult = await savePackageAction(packageId, formData);
    if (saveResult.ok) {
      redirect(`/admin/partnerships/packages`);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <a
          href="/admin/partnerships/packages"
          className="text-xs font-semibold text-plum-700 hover:underline"
        >
          ← Service packages
        </a>
        <h1 className="mt-1 font-display text-4xl font-semibold text-ink">
          Edit: {pkg.name}
        </h1>
        <p className="mt-0.5 font-mono text-xs text-ink-soft">{pkg.package_code}</p>
      </header>

      {/* Internal-only warning */}
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 max-w-2xl">
        <p className="text-sm font-semibold text-red-900">
          Internal cost data — never share with partners
        </p>
        <p className="mt-1 text-sm text-red-800">
          Fields marked <strong>Internal use only</strong> must never appear in proposals,
          contracts, invoices, or any other client-facing material. They are for internal
          planning and pricing decisions only.
        </p>
      </div>

      <form action={savePackage} className="space-y-6 max-w-2xl">
        {/* Public-facing fields */}
        <section className="rounded-xl border border-line bg-surface p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
            Package details (visible in proposals)
          </h2>

          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-ink mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={pkg.description ?? ""}
              placeholder="Brief description of what this package includes, for partner-facing use."
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
            />
          </div>

          <div>
            <label htmlFor="deliverables" className="block text-sm font-semibold text-ink mb-1">
              Deliverables{" "}
              <span className="text-xs font-normal text-ink-soft">(one per line)</span>
            </label>
            <textarea
              id="deliverables"
              name="deliverables"
              rows={5}
              defaultValue={deliverablesText}
              placeholder={"Executive summary (10–15 pp.)\nData annexe\nPresentation deck"}
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink font-mono placeholder:text-ink-soft placeholder:font-sans focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="base_price_usd"
                className="block text-sm font-semibold text-ink mb-1"
              >
                Base price (USD)
              </label>
              <input
                id="base_price_usd"
                name="base_price_usd"
                type="number"
                min="0"
                step="100"
                defaultValue={pkg.base_price_usd ?? ""}
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="price_is_provisional"
                  value="true"
                  defaultChecked={pkg.price_is_provisional}
                  className="h-4 w-4 rounded border-line accent-plum-700"
                />
                <span className="text-sm text-ink">Price is provisional</span>
              </label>
            </div>
          </div>

          <div>
            <label
              htmlFor="pricing_notes"
              className="block text-sm font-semibold text-ink mb-1"
            >
              Pricing notes{" "}
              <span className="text-xs font-normal text-ink-soft">(shown in proposals)</span>
            </label>
            <textarea
              id="pricing_notes"
              name="pricing_notes"
              rows={2}
              defaultValue={pkg.pricing_notes ?? ""}
              placeholder="e.g. Travel costs billed separately at cost."
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
            />
          </div>
        </section>

        {/* Internal cost assumptions */}
        <section className="rounded-xl border border-dashed border-red-300 bg-red-50/40 p-5 space-y-4">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">
              Internal cost assumptions
            </h2>
            <p className="mt-0.5 text-xs text-red-600">
              Internal use only — never share with partners or include in client-facing materials.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="est_staff_hours"
                className="block text-sm font-semibold text-ink mb-1"
              >
                Est. staff hours
              </label>
              <input
                id="est_staff_hours"
                name="est_staff_hours"
                type="number"
                min="0"
                step="1"
                defaultValue={pkg.est_staff_hours ?? ""}
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              />
            </div>
            <div>
              <label
                htmlFor="est_labor_cost_usd"
                className="block text-sm font-semibold text-ink mb-1"
              >
                Est. labor cost (USD)
              </label>
              <input
                id="est_labor_cost_usd"
                name="est_labor_cost_usd"
                type="number"
                min="0"
                step="100"
                defaultValue={pkg.est_labor_cost_usd ?? ""}
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              />
            </div>
            <div>
              <label
                htmlFor="est_overhead_usd"
                className="block text-sm font-semibold text-ink mb-1"
              >
                Est. overhead (USD)
              </label>
              <input
                id="est_overhead_usd"
                name="est_overhead_usd"
                type="number"
                min="0"
                step="100"
                defaultValue={pkg.est_overhead_usd ?? ""}
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              />
            </div>
          </div>
        </section>

        {/* Active status */}
        <section className="rounded-xl border border-line bg-surface p-5">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="is_active"
              value="true"
              defaultChecked={pkg.is_active}
              className="h-4 w-4 rounded border-line accent-plum-700"
            />
            <div>
              <span className="text-sm font-semibold text-ink">Package is active</span>
              <p className="text-xs text-ink-soft">
                Inactive packages are hidden from proposal selectors but their data is preserved.
              </p>
            </div>
          </label>
        </section>

        <div className="flex gap-3">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-plum-700 px-6 text-sm font-semibold text-white hover:bg-plum-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
          >
            Save changes
          </button>
          <a
            href="/admin/partnerships/packages"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-surface px-6 text-sm font-semibold text-ink hover:bg-plum-50"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
