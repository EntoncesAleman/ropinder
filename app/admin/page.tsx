"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { UserCog, Package, Receipt, Flag, Gavel, Zap, CircleCheck, Inbox } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, Panel, StatCard, EmptyState, timeAgo } from "@/components/admin/ui";

interface ActivityItem {
  id: string; kind: "USER" | "ITEM" | "SALE" | "REPORT" | "AUCTION" | "BID";
  label: string; detail: string; link: string; createdAt: string;
}

interface Stats {
  totalUsers: number; bannedUsers: number; premiumUsers: number; verifiedUsers: number;
  totalItems: number; totalMatches: number; pendingReports: number; resolvedReports: number;
  escrowTransactions: number; gmv: number; commissionEarned: number; creditsAndPremiumRevenue: number;
  attention: { pendingReports: number; pendingBankTransfers: number; pendingWithdrawals: number; reportedUsers: number; activeAuctions: number };
  activity: ActivityItem[];
}

function ActivityIcon({ kind }: { kind: ActivityItem["kind"] }) {
  const size = 14;
  switch (kind) {
    case "USER": return <UserCog size={size} />;
    case "ITEM": return <Package size={size} />;
    case "SALE": return <Receipt size={size} />;
    case "REPORT": return <Flag size={size} />;
    case "AUCTION": return <Gavel size={size} />;
    case "BID": return <Zap size={size} />;
  }
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/admin/stats");
    if (res.ok) setStats(await res.json());
  }, []);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    Promise.resolve().then(() => fetchStats());
  }, [user, fetchStats]);

  if (!stats) return null;

  const attentionItems = [
    { count: stats.attention.pendingReports, label: "reportes pendientes", href: "/admin/reportes" },
    { count: stats.attention.pendingBankTransfers, label: "transferencias por aprobar", href: "/admin/transacciones" },
    { count: stats.attention.pendingWithdrawals, label: "retiros por aprobar", href: "/admin/transacciones" },
    { count: stats.attention.reportedUsers, label: "usuarios reportados", href: "/admin/reportes" },
  ].filter((i) => i.count > 0);

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader title="Dashboard" subtitle="Resumen general de Ropinder" />

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-5">
        <StatCard label="Usuarios" value={stats.totalUsers} />
        <StatCard label="Publicaciones" value={stats.totalItems} />
        <StatCard label="Ventas por custodia" value={stats.escrowTransactions} />
        <StatCard label="Volumen (GMV)" value={`$${stats.gmv.toFixed(2)}`} tone="emerald" />
        <StatCard label="Comisión ganada" value={`$${stats.commissionEarned.toFixed(2)}`} tone="emerald" />
        <StatCard label="Créditos/Premium" value={`$${stats.creditsAndPremiumRevenue.toFixed(2)}`} tone="emerald" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 items-start">
        <Panel className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800 text-sm">Actividad reciente</h2>
          </div>
          {stats.activity.length === 0 ? (
            <EmptyState icon={Inbox} title="Sin actividad todavía" text="Los eventos recientes de usuarios, publicaciones y ventas van a aparecer acá." />
          ) : (
            <div className="flex flex-col divide-y divide-slate-100">
              {stats.activity.map((a) => (
                <Link key={a.id} href={a.link}
                  className="flex items-center gap-3 py-2.5 hover:bg-slate-50 transition -mx-1 px-1 rounded">
                  <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
                    <ActivityIcon kind={a.kind} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-700">{a.label}</p>
                    <p className="text-[11px] text-slate-400 truncate">{a.detail}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">{timeAgo(a.createdAt)}</span>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="p-4">
          <h2 className="font-semibold text-slate-800 text-sm mb-3">Requiere atención</h2>
          {attentionItems.length === 0 ? (
            <EmptyState icon={CircleCheck} title="Todo al día" text="No hay nada pendiente de revisión." />
          ) : (
            <div className="flex flex-col divide-y divide-slate-100">
              {attentionItems.map((i) => (
                <Link key={i.label} href={i.href}
                  className="flex items-center justify-between py-2.5 hover:bg-amber-50 transition -mx-1 px-1 rounded">
                  <span className="text-xs text-slate-600">{i.label}</span>
                  <span className="text-xs font-bold bg-amber-100 text-amber-700 rounded px-1.5 py-0.5 flex-shrink-0">{i.count}</span>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
