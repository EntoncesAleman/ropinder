"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert, Bell, ChevronDown, LogOut, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ADMIN_NAV, adminBreadcrumb } from "@/lib/adminNav";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { BreadcrumbProvider, useBreadcrumbValue } from "@/components/admin/BreadcrumbContext";

function Topbar({ collapsed, onToggleCollapse }: { collapsed: boolean; onToggleCollapse: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const extra = useBreadcrumbValue();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const fetchCount = () => fetch("/api/notifications").then((r) => r.json()).then((d) => setUnread(d.unreadCount ?? 0)).catch(() => {});
    fetchCount();
    const interval = setInterval(fetchCount, 15000);
    return () => clearInterval(interval);
  }, []);

  const crumbs = adminBreadcrumb(pathname);
  const isDynamic = crumbs.length > 0 && crumbs[crumbs.length - 1].label === "Detalle";

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 lg:px-6 py-2.5 flex items-center gap-4">
      <button onClick={onToggleCollapse} className="hidden lg:flex w-8 h-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition flex-shrink-0" title={collapsed ? "Expandir menú" : "Colapsar menú"}>
        {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
      </button>

      <nav className="hidden md:flex items-center gap-1.5 text-sm flex-shrink-0 min-w-0">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          const label = isLast && isDynamic ? (extra ?? "Detalle") : c.label;
          return (
            <span key={c.href + i} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && <span className="text-slate-300">/</span>}
              {isLast ? (
                <span className="font-semibold text-slate-800 truncate max-w-[220px]">{label}</span>
              ) : (
                <Link href={c.href} className="text-slate-500 hover:text-rose-500 transition">{label}</Link>
              )}
            </span>
          );
        })}
      </nav>

      <div className="flex-1 flex justify-center px-2">
        <AdminSearch />
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Link href="/notifications" className="relative w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
          <Bell size={16} />
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[8px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>

        <div className="relative">
          <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-md hover:bg-slate-100 transition">
            <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() ?? "A"}
            </span>
            <span className="hidden sm:block text-xs font-semibold text-slate-700 max-w-[100px] truncate">{user?.name ?? "Admin"}</span>
            <ChevronDown size={13} className="text-slate-400" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-md shadow-lg py-1 z-20">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-700 truncate">{user?.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                </div>
                <button onClick={handleLogout} className="w-full flex items-center gap-2 text-left px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition">
                  <LogOut size={13} /> Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Sidebar({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  return (
    <aside className={`hidden lg:flex lg:flex-col lg:flex-shrink-0 border-r border-slate-200 bg-white lg:sticky lg:top-[49px] lg:h-[calc(100vh-49px)] lg:overflow-y-auto transition-all ${collapsed ? "lg:w-16" : "lg:w-60"}`}>
      <div className={`flex items-center gap-2 px-4 py-4 border-b border-slate-200 ${collapsed ? "justify-center px-0" : ""}`}>
        <ShieldAlert size={18} className="text-rose-500 flex-shrink-0" />
        {!collapsed && <span className="font-bold text-slate-800 text-sm">Administración</span>}
      </div>
      <div className="flex flex-col py-1">
        {ADMIN_NAV.map((group, i) => (
          <div key={group.label} className={`flex flex-col gap-0.5 px-2.5 py-3 ${i > 0 ? "border-t border-slate-100" : ""}`}>
            {!collapsed && <p className="px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">{group.label}</p>}
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
              return (
                <Link key={href} href={href} title={collapsed ? label : undefined}
                  className={`group flex items-center gap-2.5 text-sm font-medium px-2.5 py-2 rounded-md transition ${collapsed ? "justify-center" : ""} ${active ? "bg-rose-50 text-rose-600" : "text-slate-600 hover:bg-slate-50"}`}>
                  <Icon size={16} className="flex-shrink-0" />
                  {!collapsed && label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("admin-sidebar-collapsed") === "1";
    Promise.resolve().then(() => { setCollapsed(stored); setHydrated(true); });
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== "ADMIN") router.push("/");
  }, [user, loading, router]);

  function toggleCollapse() {
    setCollapsed((v) => {
      localStorage.setItem("admin-sidebar-collapsed", v ? "0" : "1");
      return !v;
    });
  }

  if (loading || !user || user.role !== "ADMIN") return null;

  return (
    <BreadcrumbProvider>
      <div className="lg:min-h-screen flex flex-col bg-slate-50">
        <Topbar collapsed={hydrated && collapsed} onToggleCollapse={toggleCollapse} />
        <div className="flex-1 lg:flex lg:items-start">
          <Sidebar collapsed={hydrated && collapsed} />
          <main className="flex-1 min-w-0 px-4 py-5 lg:px-8 lg:py-6">
            <div className="lg:hidden flex items-center gap-1 bg-white border border-slate-200 rounded-md p-1 mb-4 overflow-x-auto">
              {ADMIN_NAV.flatMap((g) => g.items).map(({ href, label, icon: Icon }) => {
                const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
                return (
                  <Link key={href} href={href} className={`flex-shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded ${active ? "bg-rose-50 text-rose-600" : "text-slate-500"}`}>
                    <Icon size={13} /> {label}
                  </Link>
                );
              })}
            </div>
            {children}
          </main>
        </div>
      </div>
    </BreadcrumbProvider>
  );
}
