"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Users, SprayCan, Bug, Leaf, Sprout, FlaskConical,
  MapPin, FileText, Activity, LogOut, Moon, Sun, Menu, X, ChevronDown,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useI18n, LANGS, Lang } from "@/lib/i18n";

interface NavItem { href: string; key: string; icon: React.ElementType; perm: string | null; }

const NAV: NavItem[] = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard, perm: null },
  { href: "/users", key: "users", icon: Users, perm: "users.view" },
  { href: "/pesticides", key: "pesticides", icon: SprayCan, perm: "pesticides.view" },
  { href: "/pests", key: "pests", icon: Bug, perm: "pests.view" },
  { href: "/diseases", key: "diseases", icon: Leaf, perm: "diseases.view" },
  { href: "/weeds", key: "weeds", icon: Sprout, perm: "weeds.view" },
  { href: "/laboratory", key: "laboratory", icon: FlaskConical, perm: "lab.view" },
  { href: "/monitoring", key: "monitoring", icon: MapPin, perm: "monitoring.view" },
  { href: "/reports", key: "reports", icon: FileText, perm: "reports.view" },
  { href: "/activity-log", key: "activity_log", icon: Activity, perm: "users.view" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, can } = useAuth();
  const { theme, toggle } = useTheme();
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-[color:var(--muted)]">{t("loading")}</div>;
  }

  const items = NAV.filter((n) => !n.perm || can(n.perm));

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-green-900 text-green-50 transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 border-b border-green-800 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600"><Leaf size={20} /></div>
          <div className="text-sm font-bold leading-tight">PP System</div>
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)}><X size={20} /></button>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {items.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + "/");
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  active ? "bg-green-600 font-semibold text-white" : "text-green-100 hover:bg-green-800"
                }`}
              >
                <Icon size={18} /> {t(n.key)}
              </Link>
            );
          })}
        </nav>
      </aside>

      {open && <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3">
          <button className="lg:hidden" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <h1 className="text-lg font-bold text-[color:var(--text)]">{t("app_name")}</h1>

          <div className="ml-auto flex items-center gap-2">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-2 py-1.5 text-sm text-[color:var(--text)]"
            >
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
            <button onClick={toggle} className="rounded-lg border border-[color:var(--border)] p-2 text-[color:var(--text)]">
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="relative">
              <button onClick={() => setMenuOpen((m) => !m)} className="flex items-center gap-2 rounded-lg border border-[color:var(--border)] px-3 py-1.5 text-sm text-[color:var(--text)]">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-700 text-xs font-bold text-white">
                  {user.name.charAt(0)}
                </span>
                <span className="hidden sm:inline">{user.name}</span>
                <ChevronDown size={16} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] py-2 shadow-lg">
                  <div className="border-b border-[color:var(--border)] px-4 py-2">
                    <div className="text-sm font-semibold text-[color:var(--text)]">{user.name}</div>
                    <div className="text-xs text-[color:var(--muted)]">{user.roles.join(", ")}</div>
                  </div>
                  <button onClick={logout} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                    <LogOut size={16} /> {t("logout")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
