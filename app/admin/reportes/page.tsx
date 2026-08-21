"use client";
import { useEffect, useState, useCallback } from "react";
import { Download, Check, X, Ban, Undo2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, Panel, Badge, EmptyState } from "@/components/admin/ui";

interface Report {
  id: string; reason: string; details: string; status: string; resolution: string; createdAt: string;
  reporter: { id: string; name: string; email: string };
  reportedUser: { id: string; name: string; email: string; bannedAt: string | null } | null;
  item: { id: string; title: string; imageUrl: string } | null;
  match: { id: string } | null;
  reviewedBy: { id: string; name: string } | null;
}

const STATUS_LABEL: Record<string, string> = { PENDING: "Pendiente", REVIEWED: "Revisado", RESOLVED: "Resuelto", DISMISSED: "Descartado" };

export default function ReportesPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<"pending" | "resolved">("pending");

  const fetchReports = useCallback(async () => {
    const res = await fetch("/api/admin/reports");
    if (res.ok) setReports(await res.json());
  }, []);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    Promise.resolve().then(() => fetchReports());
  }, [user, fetchReports]);

  async function resolveReport(id: string, status: string) {
    setBusyId(id);
    const res = await fetch(`/api/admin/reports/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    if (res.ok) await fetchReports();
    setBusyId(null);
  }

  async function refundReport(id: string) {
    setBusyId(id);
    const res = await fetch(`/api/admin/reports/${id}/refund`, { method: "POST" });
    if (res.ok) await fetchReports();
    setBusyId(null);
  }

  async function toggleBan(userId: string, banned: boolean) {
    setBusyId(userId);
    const res = await fetch(`/api/admin/users/${userId}/ban`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ banned }),
    });
    if (res.ok) await fetchReports();
    setBusyId(null);
  }

  const pending = reports.filter((r) => r.status === "PENDING" || r.status === "REVIEWED");
  const resolved = reports.filter((r) => r.status === "RESOLVED" || r.status === "DISMISSED");
  const visible = tab === "pending" ? pending : resolved;

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Reportes"
        subtitle="Bandeja de moderación de contenido y usuarios."
        actions={
          // eslint-disable-next-line @next/next/no-html-link-for-pages -- triggers a file download, not a page navigation
          <a href="/api/admin/reports/export" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-rose-500 border border-slate-200 rounded-md px-3 py-1.5">
            <Download size={13} /> Exportar
          </a>
        }
      />

      <div className="flex items-center gap-1 border-b border-slate-200 mb-4">
        <button onClick={() => setTab("pending")} className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition ${tab === "pending" ? "border-rose-500 text-rose-600" : "border-transparent text-slate-500"}`}>
          Pendientes ({pending.length})
        </button>
        <button onClick={() => setTab("resolved")} className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition ${tab === "resolved" ? "border-rose-500 text-rose-600" : "border-transparent text-slate-500"}`}>
          Resueltos ({resolved.length})
        </button>
      </div>

      {visible.length === 0 ? (
        <Panel><EmptyState title={tab === "pending" ? "No hay reportes pendientes" : "Sin reportes resueltos todavía"} /></Panel>
      ) : tab === "pending" ? (
        <div className="flex flex-col gap-2.5">
          {visible.map((r) => (
            <Panel key={r.id} className="p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-rose-500 uppercase tracking-wide">{r.reason}</span>
                <Badge>{STATUS_LABEL[r.status]}</Badge>
              </div>
              <p className="text-sm text-slate-700 mb-2">{r.details || "Sin detalles adicionales."}</p>
              <p className="text-xs text-slate-400 mb-0.5">Reportado por: {r.reporter.name} ({r.reporter.email})</p>
              {r.reportedUser && (
                <p className="text-xs text-slate-400 mb-0.5">
                  Usuario reportado: {r.reportedUser.name} ({r.reportedUser.email})
                  {r.reportedUser.bannedAt && <span className="text-rose-500 font-semibold"> · Suspendido</span>}
                </p>
              )}
              {r.item && <p className="text-xs text-slate-400 mb-0.5">Prenda: {r.item.title}</p>}

              <div className="flex flex-wrap gap-2 mt-3">
                <button onClick={() => resolveReport(r.id, "RESOLVED")} disabled={busyId === r.id}
                  className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-md px-2.5 py-1.5 hover:bg-emerald-100 transition disabled:opacity-50">
                  <Check size={12} /> Resolver
                </button>
                <button onClick={() => resolveReport(r.id, "DISMISSED")} disabled={busyId === r.id}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 rounded-md px-2.5 py-1.5 hover:bg-slate-200 transition disabled:opacity-50">
                  <X size={12} /> Descartar
                </button>
                {r.reportedUser && !r.reportedUser.bannedAt && (
                  <button onClick={() => toggleBan(r.reportedUser!.id, true)} disabled={busyId === r.reportedUser.id}
                    className="flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 rounded-md px-2.5 py-1.5 hover:bg-rose-100 transition disabled:opacity-50">
                    <Ban size={12} /> Suspender usuario
                  </button>
                )}
                {r.reportedUser?.bannedAt && (
                  <button onClick={() => toggleBan(r.reportedUser!.id, false)} disabled={busyId === r.reportedUser.id}
                    className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 rounded-md px-2.5 py-1.5 hover:bg-amber-100 transition disabled:opacity-50">
                    <Undo2 size={12} /> Reactivar usuario
                  </button>
                )}
                {r.match && (
                  <button onClick={() => refundReport(r.id)} disabled={busyId === r.id}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 rounded-md px-2.5 py-1.5 hover:bg-blue-100 transition disabled:opacity-50">
                    <Undo2 size={12} /> Reembolsar comprador
                  </button>
                )}
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        <Panel className="divide-y divide-slate-100">
          {visible.map((r) => (
            <div key={r.id} className="px-4 py-3 text-sm">
              <span className="font-semibold text-slate-700">{r.reason}</span>
              <span className="text-slate-400"> · {STATUS_LABEL[r.status]}</span>
              {r.reviewedBy && <span className="text-slate-400"> · por {r.reviewedBy.name}</span>}
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}
