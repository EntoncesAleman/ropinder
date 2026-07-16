"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Bell, Heart, MessageCircle, ShieldAlert, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

interface Notif { id: string; type: string; title: string; body: string; link: string; readAt: string | null; createdAt: string }

const ICONS: Record<string, typeof Bell> = {
  MATCH: Heart,
  MESSAGE: MessageCircle,
  REPORT_RESOLVED: ShieldAlert,
};

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notif[]>([]);

  const fetchNotifs = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (res.ok) setNotifs((await res.json()).notifications);
  }, []);

  useEffect(() => {
    if (!loading && !user) { router.push("/login"); return; }
    if (user) fetchNotifs();
  }, [user, loading, router, fetchNotifs]);

  async function markRead(id: string) {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
  }

  async function markAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    await fetch("/api/notifications/read-all", { method: "POST" });
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Cargando...</div>;
  if (!user) return null;

  return (
    <div className="max-w-sm mx-auto px-4 pt-6 pb-10">
      <div className="flex items-center justify-between mb-4">
        <Link href="/" className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-sm">
          <ArrowLeft size={16} /> Volver
        </Link>
        {notifs.some((n) => !n.readAt) && (
          <button onClick={markAllRead} className="text-xs text-rose-500 font-medium hover:underline">Marcar todo leído</button>
        )}
      </div>
      <h1 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Bell size={18} className="text-rose-500" /> Notificaciones
      </h1>

      {notifs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-slate-300">
          <Bell size={40} strokeWidth={1} />
          <p className="text-sm text-center">Todavía no tenés notificaciones.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notifs.map((n) => {
            const Icon = ICONS[n.type] ?? Bell;
            const content = (
              <motion.div layout
                className={`flex items-start gap-3 rounded-2xl p-3 border transition ${n.readAt ? "bg-white border-slate-100" : "bg-rose-50 border-rose-100"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${n.readAt ? "bg-slate-100 text-slate-400" : "bg-rose-100 text-rose-500"}`}>
                  <Icon size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                  {n.body && <p className="text-xs text-slate-500 truncate">{n.body}</p>}
                </div>
              </motion.div>
            );
            return n.link ? (
              <Link key={n.id} href={n.link} onClick={() => !n.readAt && markRead(n.id)}>{content}</Link>
            ) : (
              <div key={n.id} onClick={() => !n.readAt && markRead(n.id)} className="cursor-pointer">{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
