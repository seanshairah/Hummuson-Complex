import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  ExternalLink,
  FolderTree,
  Images,
  Inbox,
  LayoutDashboard,
  LogOut,
  MessageCircleQuestion,
  Newspaper,
  Package,
  PlaySquare,
  Quote,
  Settings,
  Sprout,
  Trophy,
  Users,
} from "lucide-react";
import { auth, signOut } from "@/server/auth";
import { Logo } from "@/components/layout/logo";
import { AdminNavLink } from "@/components/admin/nav-link";
import { db } from "@/server/db";

export const metadata = {
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/crops", label: "Crops", icon: Sprout },
  { href: "/admin/faqs", label: "FAQs", icon: MessageCircleQuestion },
  { href: "/admin/articles", label: "Articles", icon: Newspaper },
  { href: "/admin/videos", label: "Videos", icon: PlaySquare },
  { href: "/admin/projects", label: "Results", icon: Trophy },
  { href: "/admin/testimonials", label: "Testimonials", icon: Quote },
  { href: "/admin/catalogue", label: "Catalogue", icon: BookOpen },
  { href: "/admin/media", label: "Media", icon: Images },
  { href: "/admin/enquiries", label: "Enquiries", icon: Inbox },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/users", label: "Users", icon: Users },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const newEnquiries = await db.enquiry.count({ where: { status: "NEW" } }).catch(() => 0);

  return (
    <div className="flex min-h-dvh bg-paper">
      {/* Sidebar */}
      <aside className="bg-grain fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-humus-950 lg:flex">
        <div className="flex h-16 items-center px-5">
          <Link href="/admin" aria-label="Admin overview">
            <Logo tone="light" className="h-8 md:h-8" />
          </Link>
        </div>
        <nav aria-label="Admin" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {NAV.map((item) => (
            <AdminNavLink
              key={item.href}
              href={item.href}
              exact={item.exact}
              badge={
                item.href === "/admin/enquiries" && newEnquiries > 0 ? newEnquiries : undefined
              }
            >
              <item.icon className="size-4" strokeWidth={1.8} />
              {item.label}
            </AdminNavLink>
          ))}
        </nav>
        <div className="border-t border-paper/10 p-3">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-paper/70 transition-colors hover:bg-paper/10 hover:text-paper"
          >
            <ExternalLink className="size-4" /> View site
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin/login" });
            }}
          >
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-paper/70 transition-colors hover:bg-paper/10 hover:text-paper"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </form>
          <p className="mt-2 truncate px-3 text-xs text-paper/40">
            {session.user.name} · {session.user.role.toLowerCase()}
          </p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-cream/90 px-4 backdrop-blur-md lg:hidden">
        <Link href="/admin">
          <Logo className="h-7 md:h-7" />
        </Link>
        <div className="scrollbar-none flex gap-2 overflow-x-auto">
          {NAV.slice(0, 6).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-line px-3 py-1.5 text-xs font-medium whitespace-nowrap text-ink-soft"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <main className="min-w-0 flex-1 px-4 pt-20 pb-16 md:px-8 lg:ml-60 lg:pt-8">{children}</main>
    </div>
  );
}
