"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  ExternalLink,
  FolderTree,
  Images,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircleQuestion,
  Newspaper,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  PlaySquare,
  Quote,
  Settings,
  Sprout,
  Trophy,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/layout/logo";
import { signOutAdmin } from "@/server/actions/admin/session";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

/** Modules grouped by job — keeps the sidebar scannable instead of one long list. */
const NAV_GROUPS: { label: string | null; items: NavItem[] }[] = [
  {
    label: null,
    items: [{ href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/categories", label: "Categories", icon: FolderTree },
      { href: "/admin/crops", label: "Crops", icon: Sprout },
      { href: "/admin/catalogue", label: "Catalogue", icon: BookOpen },
      { href: "/admin/media", label: "Media", icon: Images },
    ],
  },
  {
    label: "Knowledge",
    items: [
      { href: "/admin/faqs", label: "FAQs", icon: MessageCircleQuestion },
      { href: "/admin/articles", label: "Articles", icon: Newspaper },
      { href: "/admin/videos", label: "Videos", icon: PlaySquare },
      { href: "/admin/projects", label: "Results", icon: Trophy },
      { href: "/admin/testimonials", label: "Testimonials", icon: Quote },
    ],
  },
  {
    label: "Engagement",
    items: [
      { href: "/admin/enquiries", label: "Enquiries", icon: Inbox },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/users", label: "Users", icon: Users },
    ],
  },
];

const COLLAPSE_KEY = "humuson-admin-sidebar";

export function AdminShell({
  newEnquiries,
  userName,
  userRole,
  children,
}: {
  newEnquiries: number;
  userName: string;
  userRole: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "collapsed");
    } catch {
      // storage unavailable — keep the expanded default
    }
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  const toggleSidebar = () => {
    setCollapsed((value) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, value ? "expanded" : "collapsed");
      } catch {
        // non-fatal
      }
      return !value;
    });
  };

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const badgeFor = (item: NavItem) =>
    item.href === "/admin/enquiries" && newEnquiries > 0 ? newEnquiries : undefined;

  return (
    <div className="admin-shell flex h-dvh overflow-hidden bg-paper">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "bg-grain hidden shrink-0 flex-col bg-humus-950 transition-[width] duration-300 lg:flex",
          collapsed ? "w-[4.5rem]" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center",
            collapsed ? "justify-center" : "justify-between pr-2 pl-5",
          )}
        >
          {collapsed ? (
            <Link href="/admin" aria-label="Admin overview" title="Overview">
              <LogoMark className="size-9" />
            </Link>
          ) : (
            <>
              <Link href="/admin" aria-label="Admin overview">
                <Logo tone="light" className="h-8 md:h-8" />
              </Link>
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                className="flex size-9 items-center justify-center rounded-xl text-paper/50 transition-colors hover:bg-paper/10 hover:text-paper"
              >
                <PanelLeftClose className="size-4.5" strokeWidth={1.8} />
              </button>
            </>
          )}
        </div>

        <nav
          aria-label="Admin"
          className={cn(
            "scrollbar-none flex-1 overflow-y-auto py-3",
            collapsed ? "px-3.5" : "px-3",
          )}
        >
          {NAV_GROUPS.map((group, groupIndex) => (
            <div key={group.label ?? "top"} className={cn(groupIndex > 0 && "mt-4")}>
              {group.label &&
                (collapsed ? (
                  <div aria-hidden className="mx-1 mb-3 border-t border-paper/10" />
                ) : (
                  <p className="mb-1.5 px-3 text-[0.6rem] font-semibold tracking-[0.18em] text-paper/35 uppercase">
                    {group.label}
                  </p>
                ))}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item);
                  const badge = badgeFor(item);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "relative flex items-center rounded-xl font-display text-sm font-medium transition-colors",
                          collapsed ? "size-11 justify-center" : "gap-2.5 px-3 py-2",
                          active
                            ? "bg-leaf-400 text-humus-950"
                            : "text-paper/70 hover:bg-paper/10 hover:text-paper",
                        )}
                      >
                        <item.icon className="size-4.5 shrink-0" strokeWidth={1.8} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                        {typeof badge === "number" &&
                          (collapsed ? (
                            <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-leaf-400 text-[0.6rem] font-semibold text-humus-950">
                              {badge > 9 ? "9+" : badge}
                            </span>
                          ) : (
                            <span
                              className={cn(
                                "ml-auto rounded-full px-2 py-0.5 text-xs font-semibold",
                                active
                                  ? "bg-humus-950/15 text-humus-950"
                                  : "bg-leaf-400 text-humus-950",
                              )}
                            >
                              {badge}
                            </span>
                          ))}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className={cn("shrink-0 border-t border-paper/10 py-3", collapsed ? "px-3.5" : "px-3")}>
          {collapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="mb-0.5 flex size-11 items-center justify-center rounded-xl text-paper/50 transition-colors hover:bg-paper/10 hover:text-paper"
            >
              <PanelLeftOpen className="size-4.5" strokeWidth={1.8} />
            </button>
          )}
          <Link
            href="/"
            target="_blank"
            title={collapsed ? "View site" : undefined}
            className={cn(
              "flex items-center rounded-xl text-sm text-paper/70 transition-colors hover:bg-paper/10 hover:text-paper",
              collapsed ? "size-11 justify-center" : "gap-2.5 px-3 py-2",
            )}
          >
            <ExternalLink className="size-4.5 shrink-0" strokeWidth={1.8} />
            {!collapsed && "View site"}
          </Link>
          <form action={signOutAdmin}>
            <button
              type="submit"
              title={collapsed ? "Sign out" : undefined}
              className={cn(
                "flex items-center rounded-xl text-left text-sm text-paper/70 transition-colors hover:bg-paper/10 hover:text-paper",
                collapsed ? "size-11 justify-center" : "w-full gap-2.5 px-3 py-2",
              )}
            >
              <LogOut className="size-4.5 shrink-0" strokeWidth={1.8} />
              {!collapsed && "Sign out"}
            </button>
          </form>
          {!collapsed && (
            <p className="mt-2 truncate px-3 text-xs text-paper/40">
              {userName} · {userRole.toLowerCase()}
            </p>
          )}
        </div>
      </aside>

      {/* Main column */}
      <div className="flex h-dvh min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-cream px-4 lg:hidden">
          <Link href="/admin" aria-label="Admin overview">
            <Logo className="h-7 md:h-7" />
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open admin menu"
            aria-expanded={menuOpen}
            className="relative flex size-10 items-center justify-center rounded-full border border-line text-ink"
          >
            <Menu className="size-5" strokeWidth={1.8} />
            {newEnquiries > 0 && (
              <span className="absolute top-1 right-1 size-2 rounded-full bg-leaf-500" />
            )}
          </button>
        </div>

        <main className="scrollbar-none min-w-0 flex-1 overflow-y-auto px-4 pt-6 pb-16 md:px-8 lg:pt-8">
          {children}
        </main>
      </div>

      {/* Mobile menu overlay */}
      <div
        className={cn(
          "bg-grain fixed inset-0 z-50 flex flex-col bg-humus-950 transition-opacity duration-200 lg:hidden",
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between px-4">
          <Logo tone="light" className="h-7 md:h-7" />
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close admin menu"
            className="flex size-10 items-center justify-center rounded-full border border-paper/25 text-paper"
          >
            <X className="size-5" strokeWidth={1.8} />
          </button>
        </div>
        <nav aria-label="Admin (mobile)" className="scrollbar-none flex-1 overflow-y-auto px-4 pb-8">
          {NAV_GROUPS.map((group) => (
            <div key={group.label ?? "top"} className="mt-4 first:mt-1">
              {group.label && (
                <p className="mb-1.5 px-3 text-[0.6rem] font-semibold tracking-[0.18em] text-paper/35 uppercase">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item);
                  const badge = badgeFor(item);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 font-display text-[0.95rem] font-medium transition-colors",
                          active
                            ? "bg-leaf-400 text-humus-950"
                            : "text-paper/80 hover:bg-paper/10 hover:text-paper",
                        )}
                      >
                        <item.icon className="size-4.5" strokeWidth={1.8} />
                        {item.label}
                        {typeof badge === "number" && (
                          <span
                            className={cn(
                              "ml-auto rounded-full px-2 py-0.5 text-xs font-semibold",
                              active
                                ? "bg-humus-950/15 text-humus-950"
                                : "bg-leaf-400 text-humus-950",
                            )}
                          >
                            {badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <div className="mt-6 border-t border-paper/10 pt-4">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-paper/70 hover:bg-paper/10 hover:text-paper"
            >
              <ExternalLink className="size-4.5" strokeWidth={1.8} /> View site
            </Link>
            <form action={signOutAdmin}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-paper/70 hover:bg-paper/10 hover:text-paper"
              >
                <LogOut className="size-4.5" strokeWidth={1.8} /> Sign out
              </button>
            </form>
            <p className="mt-2 truncate px-3 text-xs text-paper/40">
              {userName} · {userRole.toLowerCase()}
            </p>
          </div>
        </nav>
      </div>
    </div>
  );
}
