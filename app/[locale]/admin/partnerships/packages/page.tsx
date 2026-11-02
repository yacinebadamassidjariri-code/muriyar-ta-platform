import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guards";
import { listServicePackages } from "@/lib/data/admin/partnerships";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "fr" ? "Forfaits de services" : "Service Packages" };
}

function usd(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function ServicePackagesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Cost estimation columns (est_labor_cost_usd, etc.) require commercial.read;
  // commercial.edit would be needed to update packages.
  await requirePermission("commercial.read");

  const result = await listServicePackages();
  const packages = result.ok ? result.value : [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl font-semibold text-ink">Service Packages</h1>
        <p className="mt-1 text-ink-soft">
          Defined service packages available to institutional partners, with pricing and
          internal cost estimates.
        </p>
      </header>

      {!result.ok && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Service packages could not be loaded.
        </p>
      )}

      {packages.length === 0 && result.ok && (
        <section className="rounded-xl border border-line bg-surface px-6 py-16 text-center">
          <h2 className="font-display text-2xl font-semibold text-ink">No packages configured</h2>
          <p className="mt-2 text-ink-soft">
            Service packages are seeded in the database migration. If this page is empty, the
            migration may not have been applied yet.
          </p>
        </section>
      )}

      {packages.length > 0 && (
        <div className="space-y-4">
          {packages.map((pkg) => {
            const totalCost =
              pkg.est_labor_cost_usd != null && pkg.est_overhead_usd != null
                ? pkg.est_labor_cost_usd + pkg.est_overhead_usd
                : null;
            const margin =
              pkg.base_price_usd != null && totalCost != null && totalCost > 0
                ? ((pkg.base_price_usd - totalCost) / pkg.base_price_usd) * 100
                : null;

            return (
              <div
                key={pkg.package_id}
                className={`rounded-xl border bg-surface p-6 ${
                  pkg.is_active ? "border-line" : "border-dashed border-stone-300 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-display text-xl font-semibold text-ink">{pkg.name}</h2>
                      <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600">
                        {pkg.package_code}
                      </code>
                      {!pkg.is_active && (
                        <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-stone-500">
                          Inactive
                        </span>
                      )}
                    </div>
                    {pkg.description && (
                      <p className="mt-1 text-sm text-ink-soft">{pkg.description}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right space-y-1">
                    <p className="font-display text-2xl font-semibold text-ink">
                      {usd(pkg.base_price_usd)}
                    </p>
                    {pkg.price_is_provisional && (
                      <p className="text-xs text-amber-700">Provisional pricing</p>
                    )}
                    <a
                      href={`/admin/partnerships/packages/${pkg.package_id}/edit`}
                      className="inline-flex items-center rounded-md border border-line bg-white px-3 py-1 text-xs font-semibold text-ink hover:bg-plum-50"
                    >
                      Edit
                    </a>
                  </div>
                </div>

                {pkg.deliverables && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft mb-1">
                      Deliverables
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-ink">{pkg.deliverables}</p>
                  </div>
                )}

                {/* Cost estimates — internal */}
                <div className="mt-4 rounded-lg border border-dashed border-stone-200 bg-stone-50 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                    Internal cost estimates
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
                    {[
                      ["Est. hours", pkg.est_staff_hours != null ? `${pkg.est_staff_hours}h` : "—"],
                      ["Labor cost", usd(pkg.est_labor_cost_usd)],
                      ["Overhead", usd(pkg.est_overhead_usd)],
                      ["Total cost", totalCost != null ? usd(totalCost) : "—"],
                      ...(margin != null ? [["Est. margin", `${margin.toFixed(0)}%`] as [string, string]] : []),
                    ].map(([label, val]) => (
                      <div key={label as string}>
                        <dt className="text-stone-500">{label}</dt>
                        <dd className="font-semibold text-stone-700">{val}</dd>
                      </div>
                    ))}
                  </div>
                </div>

                {pkg.pricing_notes && (
                  <p className="mt-3 text-xs text-ink-soft">
                    <strong>Pricing notes:</strong> {pkg.pricing_notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">Cost estimates are indicative</p>
        <p className="mt-1 text-sm text-amber-800">
          Labor and overhead figures are working estimates, not actuals. They are used for
          internal planning and pricing decisions only. Do not share internal cost data with
          partners. All pricing quoted to partners should reference the base_price_usd value
          and any applicable discounts recorded in the contract, not these estimates.
        </p>
      </div>
    </div>
  );
}
