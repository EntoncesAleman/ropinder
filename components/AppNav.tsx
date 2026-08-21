"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Heart, User, Shirt, ShieldAlert, Bookmark, Search, Gavel } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const tabs = [
  { href: "/", icon: Home, label: "Descubrir" },
  { href: "/buscar", icon: Search, label: "Buscar" },
  { href: "/subastas", icon: Gavel, label: "Subastas" },
  { href: "/matches", icon: Heart, label: "Matches" },
  { href: "/favorites", icon: Bookmark, label: "Favoritos" },
  { href: "/ropero", icon: Shirt, label: "Ropero" },
  { href: "/profile", icon: User, label: "Perfil" },
];

// Mobile keeps only the 5 highest-frequency actions — a bottom bar with 7
// items would be too cramped to stay "compacta". Desktop's taller sidebar
// has the room to show all of them.
const mobileTabs = tabs.filter((t) => !["/buscar", "/subastas"].includes(t.href));

const adminTabs = [
  { href: "/admin", icon: ShieldAlert, label: "Moderación" },
  { href: "/profile", icon: User, label: "Perfil" },
];

export function AppNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;
  const isAdmin = user.role === "ADMIN";
  // /admin has its own complete right-hand nav (see app/admin/page.tsx) — the
  // desktop rail below would just be a second, mostly-empty nav sitting next
  // to it. Mobile keeps the bottom bar as the only admin nav on small screens.
  const isAdminRoute = pathname.startsWith("/admin");
  const activeMobileTabs = isAdmin ? adminTabs : mobileTabs;

  return (
    <>
      {/* Mobile: compact bottom tab bar — unchanged from the original app-like nav. */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-100 shadow-lg">
        <div className="flex max-w-sm mx-auto">
          {activeMobileTabs.map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${active ? "text-rose-500" : "text-slate-400 hover:text-slate-600"}`}>
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop: left rail — a marketplace shell, not the mobile bar stretched wide. */}
      {!isAdminRoute && (
        <nav className="hidden lg:flex fixed top-0 left-0 bottom-0 z-40 w-56 flex-col bg-white border-r border-slate-100 px-3 py-6">
          <Link href="/" className="flex items-center gap-2 px-3 mb-8">
            <Shirt size={22} className="text-rose-500" />
            <span className="font-extrabold text-lg tracking-tight text-slate-800">Ropi<span className="text-rose-500">nder</span></span>
          </Link>
          <div className="flex flex-col gap-1">
            {(isAdmin ? adminTabs : tabs).map(({ href, icon: Icon, label }) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${active ? "bg-rose-50 text-rose-600" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}>
                  <Icon size={19} strokeWidth={active ? 2.5 : 1.8} />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
