import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/sidebar";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-7xl">
      <AdminSidebar role="administrator" />
      <section className="min-w-0 flex-1 p-6">{children}</section>
    </div>
  );
}