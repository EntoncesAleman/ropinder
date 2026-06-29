"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Heart, User, Crown, Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const tabs = [
  { href: "/", icon: Home, label: "Swipe" },
  { href: "/matches", icon: Heart, label: "Matches" },
  { href: "/profile/upload", icon: Upload, label: "Subir" },
  { href: "/premium", icon: Crown, label: "Premium" },
  { href: "/profile", icon: User, label: "Perfil" },
];

export function AppNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-100 shadow-lg">
      <div className="flex max-w-sm mx-auto">
        {tabs.map(({ href, icon: Icon, label }) => {
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
  );
}
