"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldAlert, Ban, Undo2, Check, X, UserCog, KeyRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Report {
  id: string;
  reason: string;
  details: string;
  status: string;
  resolution: string;
  createdAt: string;
  reporter: { id: string; name: string; email: string };
  reportedUser: { id: string; name: string; email: string; bannedAt: string | null } | null;
  item: { id: string; title: string; imageUrl: string } | null;
  match: { id: string } | null;
  reviewedBy: { id: string; name: string } | null;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  REVIEWED: "Revisado",
  RESOLVED: "Resuelto",
  DISMISSED: "Descartado",
};

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [promoteEmail, setPromoteEmail] = useState("");
  const [promoteMsg, setPromoteMsg] = useState("");
  const [promoteBusy, setPromoteBusy] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== "ADMIN") router.push("/");
  }, [user, loading, router]);

  const fetchReports = useCallback(async () => {
    const res = await fetch("/api/admin/reports");
    const data = await res.json();
    if (res.ok) setReports(data);
    else setError(data.error ?? "Error al cargar reportes");
  }, []);

  useEffect(() => {
    if (user?.role === "ADMIN") fetchReports();
  }, [user, fetchReports]);

  async function resolveReport(id: string, status: string) {
    setBusyId(id);
    const res = await fetch(`/api/admin/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) await fetchReports();
    else setError((await res.json()).error ?? "Error");
    setBusyId(null);
  }

  async function refundReport(id: string) {
    setBusyId(id);
    const res = await fetch(`/api/admin/reports/${id}/refund`, { method: "POST" });
    if (res.ok) await fetchReports();
    else setError((await res.json()).error ?? "Error");
    setBusyId(null);
  }

  async function handlePromote(role: "ADMIN" | "USER") {
    setPromoteBusy(true);
    setPromoteMsg("");
    const res = await fetch("/api/admin/promote", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: promoteEmail.trim(), role }),
    });
    const data = await res.json();
    setPromoteMsg(res.ok ? `${data.user.email} ahora es ${role}` : data.error);
    if (res.ok) setPromoteEmail("");
    setPromoteBusy(false);
  }

  async function handleResetPassword() {
    setResetBusy(true);
    setResetMsg("");
    const res = await fetch("/api/admin/reset-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: resetEmail.trim(), newPassword: resetPassword }),
    });
    const data = await res.json();
    setResetMsg(res.ok ? "Contraseña actualizada ✓" : data.error);
    if (res.ok) { setResetEmail(""); setResetPassword(""); }
    setResetBusy(false);
  }

  async function toggleBan(userId: string, banned: boolean) {
    setBusyId(userId);
    const res = await fetch(`/api/admin/users/${userId}/ban`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned }),
    });
    if (res.ok) await fetchReports();
    else setError((await res.json()).error ?? "Error");
    setBusyId(null);
  }

  if (loading || !user || user.role !== "ADMIN") return null;

  const pending = reports.filter((r) => r.status === "PENDING" || r.status === "REVIEWED");
  const resolved = reports.filter((r) => r.status === "RESOLVED" || r.status === "DISMISSED");

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-10">
      <div className="flex items-center gap-2 mb-6">
        <ShieldAlert size={22} className="text-rose-500" />
        <h1 className="font-bold text-slate-800 text-xl">Moderación</h1>
      </div>

      {error && <p className="text-xs text-rose-500 mb-4">{error}</p>}

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4">
        <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-2"><UserCog size={13} /> Otorgar / quitar admin</p>
        <div className="flex gap-2">
          <input value={promoteEmail} onChange={(e) => setPromoteEmail(e.target.value)} placeholder="email@ejemplo.com"
            className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300" />
          <button onClick={() => handlePromote("ADMIN")} disabled={promoteBusy || !promoteEmail.trim()}
            className="text-xs bg-slate-700 text-white font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-50">Dar admin</button>
          <button onClick={() => handlePromote("USER")} disabled={promoteBusy || !promoteEmail.trim()}
            className="text-xs bg-slate-100 text-slate-600 font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-50">Quitar</button>
        </div>
        {promoteMsg && <p className="text-[11px] text-slate-500 mt-1.5">{promoteMsg}</p>}
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-6">
        <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-2"><KeyRound size={13} /> Resetear contraseña de un usuario</p>
        <div className="flex flex-col gap-2">
          <input value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="email@ejemplo.com"
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300" />
          <div className="flex gap-2">
            <input value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="Contraseña nueva (mín. 6)" type="text"
              className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300" />
            <button onClick={handleResetPassword} disabled={resetBusy || !resetEmail.trim() || resetPassword.length < 6}
              className="text-xs bg-slate-700 text-white font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-50">Resetear</button>
          </div>
        </div>
        {resetMsg && <p className="text-[11px] text-slate-500 mt-1.5">{resetMsg}</p>}
      </div>

      <h2 className="font-semibold text-slate-700 text-sm mb-3">Pendientes ({pending.length})</h2>
      {pending.length === 0 ? (
        <p className="text-sm text-slate-400 mb-8">No hay reportes pendientes.</p>
      ) : (
        <div className="flex flex-col gap-3 mb-8">
          {pending.map((r) => (
            <motion.div key={r.id} layout className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-rose-500 uppercase">{r.reason}</span>
                <span className="text-xs text-slate-400">{STATUS_LABEL[r.status]}</span>
              </div>
              <p className="text-sm text-slate-700 mb-2">{r.details || "Sin detalles adicionales."}</p>
              <p className="text-xs text-slate-400 mb-1">Reportado por: {r.reporter.name} ({r.reporter.email})</p>
              {r.reportedUser && (
                <p className="text-xs text-slate-400 mb-1">
                  Usuario reportado: {r.reportedUser.name} ({r.reportedUser.email})
                  {r.reportedUser.bannedAt && <span className="text-rose-500 font-semibold"> · Suspendido</span>}
                </p>
              )}
              {r.item && <p className="text-xs text-slate-400 mb-1">Prenda: {r.item.title}</p>}

              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => resolveReport(r.id, "RESOLVED")}
                  disabled={busyId === r.id}
                  className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 rounded-full px-3 py-1.5 hover:bg-emerald-200 transition disabled:opacity-50"
                >
                  <Check size={12} /> Resolver
                </button>
                <button
                  onClick={() => resolveReport(r.id, "DISMISSED")}
                  disabled={busyId === r.id}
                  className="flex items-center gap-1 text-xs bg-slate-100 text-slate-600 rounded-full px-3 py-1.5 hover:bg-slate-200 transition disabled:opacity-50"
                >
                  <X size={12} /> Descartar
                </button>
                {r.reportedUser && !r.reportedUser.bannedAt && (
                  <button
                    onClick={() => toggleBan(r.reportedUser!.id, true)}
                    disabled={busyId === r.reportedUser.id}
                    className="flex items-center gap-1 text-xs bg-rose-100 text-rose-600 rounded-full px-3 py-1.5 hover:bg-rose-200 transition disabled:opacity-50"
                  >
                    <Ban size={12} /> Suspender usuario
                  </button>
                )}
                {r.reportedUser?.bannedAt && (
                  <button
                    onClick={() => toggleBan(r.reportedUser!.id, false)}
                    disabled={busyId === r.reportedUser.id}
                    className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 rounded-full px-3 py-1.5 hover:bg-amber-200 transition disabled:opacity-50"
                  >
                    <Undo2 size={12} /> Reactivar usuario
                  </button>
                )}
                {r.match && (
                  <button
                    onClick={() => refundReport(r.id)}
                    disabled={busyId === r.id}
                    className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 rounded-full px-3 py-1.5 hover:bg-blue-200 transition disabled:opacity-50"
                  >
                    <Undo2 size={12} /> Reembolsar comprador
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <h2 className="font-semibold text-slate-700 text-sm mb-3">Resueltos ({resolved.length})</h2>
      {resolved.length === 0 ? (
        <p className="text-sm text-slate-400">Todavía no resolviste ningún reporte.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {resolved.map((r) => (
            <div key={r.id} className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500">
              <span className="font-semibold">{r.reason}</span> · {STATUS_LABEL[r.status]}
              {r.reviewedBy && <span> · por {r.reviewedBy.name}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
