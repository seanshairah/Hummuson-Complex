import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { AdminShell } from "@/components/admin/shell";
import { db } from "@/server/db";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const newEnquiries = await db.enquiry.count({ where: { status: "NEW" } }).catch(() => 0);

  return (
    <AdminShell
      newEnquiries={newEnquiries}
      userName={session.user.name ?? "Admin"}
      userRole={session.user.role}
    >
      {children}
    </AdminShell>
  );
}
