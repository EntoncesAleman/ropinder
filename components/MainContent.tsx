"use client";
import { usePathname } from "next/navigation";

// The lg:pl-56 reserves space for AppNav's fixed left rail — but that rail
// doesn't render on /admin (it has its own sidebar instead, see
// app/admin/layout.tsx), so admin pages shouldn't reserve empty space for it.
export function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");
  return (
    <main className={isAdminRoute ? "pb-20 lg:pb-0" : "pb-20 lg:pb-0 lg:pl-56"}>
      {children}
    </main>
  );
}
