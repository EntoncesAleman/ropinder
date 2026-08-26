import {
  BarChart3, Package, Gavel, Repeat, Receipt, Users, Flag, Wrench, Search, Percent, MessageCircle,
} from "lucide-react";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: typeof BarChart3;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

// Single source of truth for the admin sidebar AND breadcrumbs — every group
// here maps 1:1 to a real, working page. Nothing added just to fill the menu
// (see ADMIN_AUDIT.md for what's deliberately NOT here yet and why).
export const ADMIN_NAV: AdminNavGroup[] = [
  { label: "General", items: [
    { href: "/admin", label: "Dashboard", icon: BarChart3 },
  ] },
  { label: "Marketplace", items: [
    { href: "/admin/publicaciones", label: "Publicaciones", icon: Package },
    { href: "/admin/subastas", label: "Subastas", icon: Gavel },
  ] },
  { label: "Operaciones", items: [
    { href: "/admin/ofertas", label: "Ofertas", icon: Repeat },
    { href: "/admin/transacciones", label: "Transacciones", icon: Receipt },
  ] },
  { label: "Usuarios", items: [
    { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  ] },
  { label: "Finanzas", items: [
    { href: "/admin/comisiones", label: "Comisiones", icon: Percent },
  ] },
  { label: "Moderación", items: [
    { href: "/admin/reportes", label: "Reportes", icon: Flag },
    { href: "/admin/chat", label: "Banco de preguntas", icon: MessageCircle },
  ] },
  { label: "Sistema", items: [
    { href: "/admin/herramientas", label: "Herramientas", icon: Wrench },
    { href: "/admin/seo", label: "SEO", icon: Search },
  ] },
];

export const ADMIN_NAV_FLAT: AdminNavItem[] = ADMIN_NAV.flatMap((g) => g.items);

// Breadcrumb label for a pathname — matches the longest known prefix, falls
// back to a readable guess for dynamic segments (e.g. /admin/usuarios/xyz).
// /admin/users/[id] is a special case: the detail route lives at a
// different path than its list page (/admin/usuarios), so it can't be
// found by prefix match against ADMIN_NAV_FLAT.
export function adminBreadcrumb(pathname: string): { label: string; href: string }[] {
  if (pathname === "/admin") return [{ label: "Dashboard", href: "/admin" }];

  if (pathname.startsWith("/admin/users/")) {
    return [
      { label: "Dashboard", href: "/admin" },
      { label: "Usuarios", href: "/admin/usuarios" },
      { label: "Detalle", href: pathname },
    ];
  }

  const known = ADMIN_NAV_FLAT.find((i) => i.href !== "/admin" && pathname.startsWith(i.href));
  const crumbs: { label: string; href: string }[] = [{ label: "Dashboard", href: "/admin" }];
  if (known) crumbs.push({ label: known.label, href: known.href });

  if (known && pathname.length > known.href.length) {
    crumbs.push({ label: "Detalle", href: pathname });
  }
  return crumbs;
}
