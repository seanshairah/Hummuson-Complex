import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { AdminShell } from "@/components/admin/shell";
import { db } from "@/server/db";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // requireUser() rather than auth(): it also refuses a session that has been
  // revoked — deactivated account, changed password, changed role — so a
  // revocation lands on the next page view instead of whenever the token
  // happens to be re-checked.
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/admin/login");

  const newEnquiries = await db.enquiry.count({ where: { status: "NEW" } }).catch(() => 0);

  return (
    <AdminShell
      newEnquiries={newEnquiries}
      userName={user.name ?? "Admin"}
      userRole={user.role}
    >
      {children}
    </AdminShell>
  );
}
