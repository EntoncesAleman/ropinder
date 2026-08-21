"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Lets a leaf page (e.g. /admin/usuarios/[id]) inject a real trailing
// breadcrumb label ("Tomás Alemán") once its data loads, instead of the
// layout showing a generic "Detalle" placeholder for dynamic segments.
const Ctx = createContext<{ extra: string | null; setExtra: (v: string | null) => void }>({
  extra: null,
  setExtra: () => {},
});

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [extra, setExtra] = useState<string | null>(null);
  return <Ctx.Provider value={{ extra, setExtra }}>{children}</Ctx.Provider>;
}

export function useBreadcrumbExtra(label: string | null) {
  const { setExtra } = useContext(Ctx);
  useEffect(() => {
    setExtra(label);
    return () => setExtra(null);
  }, [label, setExtra]);
}

export function useBreadcrumbValue(): string | null {
  return useContext(Ctx).extra;
}
