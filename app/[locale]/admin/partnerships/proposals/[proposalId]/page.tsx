import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { getProposal, listOrganizations, listServicePackages } from "@/lib/data/admin/partnerships";
import { saveProposalAction } from "@/lib/actions/admin/partnerships";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; proposalId: string }>;
}): Promise<Metadata> {
  const { proposalId } = await params;
  const result = await getProposal(proposalId);
  return { title: result.ok ? result.value.title : "Proposal" };
}

const PROPOSAL_STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "DECLINED", label: "Declined" },
  { value: "SUPERSEDED", label: "Superseded" },
] as const;

const STATUS_CLASSES: Record<string, string> = {
  DRAFT: "bg-stone-100 text-stone-600",
  SENT: "bg-blue-100 text-blue-800",
  ACCEPTED: "bg-emerald-100 text-emerald-800",
  DECLINED: "bg-red-100 text-red-800",
  SUPERSEDED: "bg-stone-200 text-stone-500",
};

function usd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function ProposalDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; proposalId: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { locale, proposalId } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  await requirePermission("commercial.read");

  const [proposalResult, orgsResult, packagesResult] = await Promise.all([
    getProposal(proposalId),
    listOrganizations({}),
    listServicePackages(),
  ]);

  if (!proposalResult.ok) notFound();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const proposal = (proposalResult as Extract<typeof proposalResult, { ok: true }>).value;
  const orgs = orgsResult.ok ? orgsResult.value.items : [];
  const packages = packagesResult.ok ? packagesResult.value : [];
  const isEditing = sp.edit === "1";

  const statusLabel = PROPOSAL_STATUSES.find((s) => s.value === proposal.status)?.label ?? proposal.status;

  async function updateProposal(formData: FormData) {
    "use server";
    const result = await saveProposalAction(proposalId, formData);
    if (result.ok) {
      redirect(`/admin/partnerships/proposals/${proposalId}`);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/partnerships/proposals"
            className="text-xs font-semibold text-plum-700 hover:underline"
          >
            ← Proposals
          </Link>
          <h1 className="mt-1 font-display text-4xl font-semibold text-ink">{proposal.title}</h1>
          <p className="mt-1 font-mono text-xs text-ink-soft">{proposal.proposal_number}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
              STATUS_CLASSES[proposal.status] ?? "bg-stone-100 text-stone-700"
            }`}
          >
            {statusLabel}
          </span>
          {!isEditing && (
            <a
              href="?edit=1"
              className="inline-flex min-h-9 items-center justify-center rounded-md border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-plum-50"
            >
              Edit
            </a>
          )}
        </div>
      </header>

      {/* Pricing notice — always visible */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 max-w-2xl">
        <p className="text-sm font-semibold text-amber-900">Pricing notice</p>
        <p className="mt-1 text-sm text-amber-800">
          All prices in proposals are provisional until approved by the Programme Director.
          Proposals do not constitute a binding offer.
        </p>
      </div>

      {isEditing ? (
        /* ------------------------------------------------------------------ */
        /* Edit form                                                           */
        /* ------------------------------------------------------------------ */
        <form action={updateProposal} className="space-y-6 max-w-2xl">
          <section className="rounded-xl border border-line bg-surface p-5 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
              Edit proposal
            </h2>

            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-ink mb-1">
                Title <span className="text-danger" aria-label="required">*</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                defaultValue={proposal.title}
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              />
            </div>

            <div>
              <label htmlFor="org_id" className="block text-sm font-semibold text-ink mb-1">
                Organization <span className="text-danger" aria-label="required">*</span>
              </label>
              <select
                id="org_id"
                name="org_id"
                required
                defaultValue={proposal.org_id}
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              >
                <option value="">— Select organization —</option>
                {orgs.map((org) => (
                  <option key={org.org_id} value={org.org_id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="package_id" className="block text-sm font-semibold text-ink mb-1">
                  Service package
                </label>
                <select
                  id="package_id"
                  name="package_id"
                  defaultValue={proposal.package_id ?? ""}
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
                >
                  <option value="">— None —</option>
                  {packages.map((pkg) => (
                    <option key={pkg.package_id} value={pkg.package_id}>
                      {pkg.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="quoted_price_usd" className="block text-sm font-semibold text-ink mb-1">
                  Quoted price (USD)
                </label>
                <input
                  id="quoted_price_usd"
                  name="quoted_price_usd"
                  type="number"
                  min="0"
                  step="100"
                  defaultValue={proposal.quoted_price_usd ?? ""}
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
                />
              </div>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-semibold text-ink mb-1">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={proposal.status}
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              >
                {PROPOSAL_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="scope_description" className="block text-sm font-semibold text-ink mb-1">
                Scope description
              </label>
              <textarea
                id="scope_description"
                name="scope_description"
                rows={4}
                defaultValue={proposal.scope_description ?? ""}
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              />
            </div>

            <div>
              <label htmlFor="deliverables" className="block text-sm font-semibold text-ink mb-1">
                Deliverables
              </label>
              <textarea
                id="deliverables"
                name="deliverables"
                rows={3}
                defaultValue={proposal.deliverables ?? ""}
                placeholder="One deliverable per line"
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="timeline_weeks" className="block text-sm font-semibold text-ink mb-1">
                  Timeline (weeks)
                </label>
                <input
                  id="timeline_weeks"
                  name="timeline_weeks"
                  type="number"
                  min="1"
                  max="104"
                  defaultValue={proposal.timeline_weeks ?? ""}
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
                />
              </div>
              <div>
                <label htmlFor="sent_at" className="block text-sm font-semibold text-ink mb-1">
                  Sent date
                </label>
                <input
                  id="sent_at"
                  name="sent_at"
                  type="date"
                  defaultValue={proposal.sent_at ?? ""}
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
                />
              </div>
            </div>
          </section>

          <div className="flex gap-3">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-plum-700 px-6 text-sm font-semibold text-white hover:bg-plum-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
            >
              Save changes
            </button>
            <a
              href={`/admin/partnerships/proposals/${proposalId}`}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-surface px-6 text-sm font-semibold text-ink hover:bg-plum-50"
            >
              Cancel
            </a>
          </div>
        </form>
      ) : (
        /* ------------------------------------------------------------------ */
        /* Read view                                                           */
        /* ------------------------------------------------------------------ */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <section className="rounded-xl border border-line bg-surface p-5">
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                Details
              </h2>
              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  ["Organization", proposal.org_name],
                  ["Quoted price", proposal.quoted_price_usd != null ? usd(proposal.quoted_price_usd) : "—"],
                  ["Service package", proposal.package_name ?? "—"],
                  ["Timeline", proposal.timeline_weeks != null ? `${proposal.timeline_weeks} weeks` : "—"],
                  ["Sent", proposal.sent_at ? new Date(proposal.sent_at).toLocaleDateString() : "Not sent"],
                  ["Expires", proposal.expires_at ? new Date(proposal.expires_at).toLocaleDateString() : "—"],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <dt className="text-ink-soft">{label}</dt>
                    <dd className="mt-0.5 font-medium text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {proposal.scope_description && (
              <section className="rounded-xl border border-line bg-surface p-5">
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                  Scope
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-sm text-ink">{proposal.scope_description}</p>
              </section>
            )}

            {proposal.deliverables && (
              <section className="rounded-xl border border-line bg-surface p-5">
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                  Deliverables
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-sm text-ink">{proposal.deliverables}</p>
              </section>
            )}

            {proposal.internal_notes && (
              <section className="rounded-xl border border-line bg-surface p-5">
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                  Internal notes
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-sm text-ink">{proposal.internal_notes}</p>
              </section>
            )}
          </div>

          <aside className="space-y-4">
            <section className="rounded-xl border border-line bg-surface p-5">
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                Record
              </h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Created</dt>
                  <dd className="text-ink">{new Date(proposal.created_at).toLocaleDateString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Updated</dt>
                  <dd className="text-ink">{new Date(proposal.updated_at).toLocaleDateString()}</dd>
                </div>
              </dl>
            </section>

            <Link
              href={`/admin/partnerships/organizations/${proposal.org_id}`}
              className="flex min-h-10 items-center justify-center rounded-md border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-plum-50"
            >
              View organization
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
