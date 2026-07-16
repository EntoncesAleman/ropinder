"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { SwipeScreen } from "@/components/SwipeScreen";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) { router.push("/login"); return; }
    if (!loading && user?.role === "ADMIN") router.push("/admin");
  }, [user, loading, router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Cargando...</div>
  );
  if (!user || user.role === "ADMIN") return null;
  return <SwipeScreen />;
}
