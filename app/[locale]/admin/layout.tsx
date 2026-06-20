import type { ReactNode } from "react";
import { requireStaff } from "@/lib/auth/guards";
import { AdminSidebar } from "@/components/admin/sidebar";

/**
 * AdminShell (Application Structure §3). Server component that enforces staff
 * access before rendering, then lays out the sidebar + content. Middleware already
 * blocks unauthenticated access; this guard enforces the role and the DB enforces
 * RLS on every query.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireStaff();
  return (
    <div className="mx-auto flex w-full max-w-7xl">
      <AdminSidebar role={profile.role} />
      <section className="min-w-0 flex-1 p-6">{children}</section>
    </div>
  );
}
