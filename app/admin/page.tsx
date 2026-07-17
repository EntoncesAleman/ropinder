"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShieldAlert, Ban, Undo2, Check, X, UserCog, KeyRound, Download,
  Users, Receipt, BarChart3, Flag, Zap, Wrench, Crown, Gift, Trash2, Search, ShieldOff,
} from "lucide-react";
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

interface Stats {
  totalUsers: number; bannedUsers: number; premiumUsers: number; verifiedUsers: number;
  totalItems: number; totalMatches: number; pendingReports: number; resolvedReports: number;
  escrowTransactions: number; gmv: number; commissionEarned: number; creditsAndPremiumRevenue: number;
}

interface AdminUser {
  id: string; name: string; fullName: string; email: string; phone: string; role: string;
  bannedAt: string | null; isPremium: boolean; premiumUntil: string | null; verified: boolean;
  credits: number; balance: number; ratingAvg: number; ratingCount: number; createdAt: string;
}

interface AdminTx {
  id: string; amount: number; type: string; status: string; createdAt: string;
  user: { id: string; name: string; email: string };
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  REVIEWED: "Revisado",
  RESOLVED: "Resuelto",
  DISMISSED: "Descartado",
};

const TABS = [
  { id: "resumen", label: "Resumen", icon: BarChart3 },
  { id: "reportes", label: "Reportes", icon: Flag },
  { id: "usuarios", label: "Usuarios", icon: Users },
  { id: "transacciones", label: "Transacciones", icon: Receipt },
  { id: "herramientas", label: "Herramientas", icon: Wrench },
  { id: "seo", label: "SEO", icon: Search },
] as const;

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("resumen");
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [txs, setTxs] = useState<AdminTx[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [promoteEmail, setPromoteEmail] = useState("");
  const [promoteMsg, setPromoteMsg] = useState("");
  const [promoteBusy, setPromoteBusy] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [grantEmail, setGrantEmail] = useState("");
  const [grantCredits, setGrantCredits] = useState("");
  const [grantNote, setGrantNote] = useState("");
  const [grantMsg, setGrantMsg] = useState("");
  const [grantBusy, setGrantBusy] = useState(false);
  const [premiumEmail, setPremiumEmail] = useState("");
  const [premiumDays, setPremiumDays] = useState("30");
  const [premiumVerified, setPremiumVerified] = useState(false);
  const [premiumMsg, setPremiumMsg] = useState("");
  const [premiumBusy, setPremiumBusy] = useState(false);
  const [promoMode, setPromoMode] = useState<"ALL" | "RAFFLE">("ALL");
  const [promoCredits, setPromoCredits] = useState("");
  const [promoNote, setPromoNote] = useState("");
  const [promoMsg, setPromoMsg] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);
  const [blacklist, setBlacklist] = useState<{ id: string; email: string; reason: string; blockedBy: string; createdAt: string }[]>([]);
  const [blacklistEmail, setBlacklistEmail] = useState("");
  const [blacklistReason, setBlacklistReason] = useState("");
  const [blacklistMsg, setBlacklistMsg] = useState("");
  const [blacklistBusy, setBlacklistBusy] = useState(false);
  const [llmsTxt, setLlmsTxt] = useState("");

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

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/admin/stats");
    if (res.ok) setStats(await res.json());
  }, []);

  const fetchUsers = useCallback(async (q: string) => {
    const res = await fetch(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    if (res.ok) setUsers(await res.json());
  }, []);

  const fetchTxs = useCallback(async () => {
    const res = await fetch("/api/admin/transactions");
    if (res.ok) setTxs(await res.json());
  }, []);

  const fetchBlacklist = useCallback(async () => {
    const res = await fetch("/api/admin/blacklist");
    if (res.ok) setBlacklist(await res.json());
  }, []);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    fetchReports();
    fetchStats();
    fetchUsers("");
    fetchTxs();
    fetchBlacklist();
  }, [user, fetchReports, fetchStats, fetchUsers, fetchTxs, fetchBlacklist]);

  async function handleAddBlacklist() {
    setBlacklistBusy(true);
    setBlacklistMsg("");
    const res = await fetch("/api/admin/blacklist", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: blacklistEmail.trim(), reason: blacklistReason }),
    });
    const data = await res.json();
    if (!res.ok) setBlacklistMsg(data.error);
    else { setBlacklistEmail(""); setBlacklistReason(""); await fetchBlacklist(); }
    setBlacklistBusy(false);
  }

  async function handleRemoveBlacklist(id: string) {
    setBlacklistBusy(true);
    await fetch(`/api/admin/blacklist/${id}`, { method: "DELETE" });
    await fetchBlacklist();
    setBlacklistBusy(false);
  }

  useEffect(() => {
    if (tab === "seo" && !llmsTxt) fetch("/llms.txt").then((r) => r.text()).then(setLlmsTxt);
  }, [tab, llmsTxt]);

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
    if (res.ok) { await fetchReports(); await fetchStats(); }
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
    if (res.ok) { setPromoteEmail(""); await fetchUsers(userQuery); }
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

  async function handleGrantCredits() {
    setGrantBusy(true);
    setGrantMsg("");
    const res = await fetch("/api/admin/grant-credits", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: grantEmail.trim(), credits: Number(grantCredits), note: grantNote }),
    });
    const data = await res.json();
    setGrantMsg(res.ok ? `${grantCredits}✦ acreditados a ${data.user.email} (ahora tiene ${data.user.credits}✦)` : data.error);
    if (res.ok) { setGrantEmail(""); setGrantCredits(""); setGrantNote(""); await fetchTxs(); }
    setGrantBusy(false);
  }

  async function handleGrantPremium() {
    setPremiumBusy(true);
    setPremiumMsg("");
    const res = await fetch("/api/admin/grant-premium", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: premiumEmail.trim(), days: Number(premiumDays), verified: premiumVerified }),
    });
    const data = await res.json();
    setPremiumMsg(res.ok ? `${data.user.email} es Premium hasta ${new Date(data.user.premiumUntil).toLocaleDateString("es-AR")}` : data.error);
    if (res.ok) { setPremiumEmail(""); await fetchUsers(userQuery); }
    setPremiumBusy(false);
  }

  async function handlePromo() {
    setPromoBusy(true);
    setPromoMsg("");
    const res = await fetch("/api/admin/promo", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: promoMode, credits: Number(promoCredits), note: promoNote }),
    });
    const data = await res.json();
    if (!res.ok) setPromoMsg(data.error);
    else if (promoMode === "ALL") setPromoMsg(`${promoCredits}✦ acreditados a ${data.usersAffected} usuarios`);
    else setPromoMsg(`🎉 Ganador del sorteo: ${data.winnerEmail} (entre ${data.poolSize} usuarios) — ${promoCredits}✦ acreditados`);
    if (res.ok) { setPromoCredits(""); setPromoNote(""); await fetchTxs(); }
    setPromoBusy(false);
  }

  async function deleteUser(userId: string) {
    if (!confirm("¿Borrar esta cuenta para siempre, junto con todo lo que publicó? No se puede deshacer.")) return;
    setDeleteBusyId(userId);
    const res = await fetch(`/api/admin/users/${userId}/delete`, { method: "POST" });
    if (res.ok) { await fetchUsers(userQuery); await fetchStats(); }
    else setError((await res.json()).error ?? "Error");
    setDeleteBusyId(null);
  }

  async function toggleBan(userId: string, banned: boolean) {
    setBusyId(userId);
    const res = await fetch(`/api/admin/users/${userId}/ban`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned }),
    });
    if (res.ok) { await fetchReports(); await fetchUsers(userQuery); }
    else setError((await res.json()).error ?? "Error");
    setBusyId(null);
  }

  if (loading || !user || user.role !== "ADMIN") return null;

  const pending = reports.filter((r) => r.status === "PENDING" || r.status === "REVIEWED");
  const resolved = reports.filter((r) => r.status === "RESOLVED" || r.status === "DISMISSED");

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-10">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert size={22} className="text-rose-500" />
        <h1 className="font-bold text-slate-800 text-xl">Administración</h1>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1 text-xs font-semibold px-2 py-2 rounded-lg whitespace-nowrap transition ${tab === id ? "bg-white text-rose-500 shadow-sm" : "text-slate-500"}`}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-rose-500 mb-4">{error}</p>}

      {tab === "resumen" && stats && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Usuarios totales" value={stats.totalUsers} />
          <StatCard label="Suspendidos" value={stats.bannedUsers} tone="rose" />
          <StatCard label="Premium activos" value={stats.premiumUsers} tone="amber" />
          <StatCard label="Verificados" value={stats.verifiedUsers} tone="blue" />
          <StatCard label="Prendas publicadas" value={stats.totalItems} />
          <StatCard label="Matches totales" value={stats.totalMatches} />
          <StatCard label="Reportes pendientes" value={stats.pendingReports} tone="rose" />
          <StatCard label="Reportes resueltos" value={stats.resolvedReports} tone="emerald" />
          <StatCard label="Ventas por custodia" value={stats.escrowTransactions} />
          <StatCard label="Volumen transado (GMV)" value={`$${stats.gmv.toFixed(2)}`} tone="emerald" />
          <StatCard label="Comisión ganada" value={`$${stats.commissionEarned.toFixed(2)}`} tone="emerald" />
          <StatCard label="Ingresos créditos/Premium" value={`$${stats.creditsAndPremiumRevenue.toFixed(2)}`} tone="emerald" />
        </div>
      )}

      {tab === "reportes" && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-700 text-sm">Pendientes ({pending.length})</h2>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- triggers a file download, not a page navigation */}
            <a href="/api/admin/reports/export" className="flex items-center gap-1 text-xs text-slate-500 hover:text-rose-500"><Download size={12} /> CSV</a>
          </div>
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
                    <button onClick={() => resolveReport(r.id, "RESOLVED")} disabled={busyId === r.id}
                      className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 rounded-full px-3 py-1.5 hover:bg-emerald-200 transition disabled:opacity-50">
                      <Check size={12} /> Resolver
                    </button>
                    <button onClick={() => resolveReport(r.id, "DISMISSED")} disabled={busyId === r.id}
                      className="flex items-center gap-1 text-xs bg-slate-100 text-slate-600 rounded-full px-3 py-1.5 hover:bg-slate-200 transition disabled:opacity-50">
                      <X size={12} /> Descartar
                    </button>
                    {r.reportedUser && !r.reportedUser.bannedAt && (
                      <button onClick={() => toggleBan(r.reportedUser!.id, true)} disabled={busyId === r.reportedUser.id}
                        className="flex items-center gap-1 text-xs bg-rose-100 text-rose-600 rounded-full px-3 py-1.5 hover:bg-rose-200 transition disabled:opacity-50">
                        <Ban size={12} /> Suspender usuario
                      </button>
                    )}
                    {r.reportedUser?.bannedAt && (
                      <button onClick={() => toggleBan(r.reportedUser!.id, false)} disabled={busyId === r.reportedUser.id}
                        className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 rounded-full px-3 py-1.5 hover:bg-amber-200 transition disabled:opacity-50">
                        <Undo2 size={12} /> Reactivar usuario
                      </button>
                    )}
                    {r.match && (
                      <button onClick={() => refundReport(r.id)} disabled={busyId === r.id}
                        className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 rounded-full px-3 py-1.5 hover:bg-blue-200 transition disabled:opacity-50">
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
        </>
      )}

      {tab === "usuarios" && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <input value={userQuery} onChange={(e) => { setUserQuery(e.target.value); fetchUsers(e.target.value); }}
              placeholder="Buscar por nombre o email..."
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300" />
            <a href="/api/admin/users/export" className="flex items-center gap-1 text-xs text-slate-500 hover:text-rose-500 whitespace-nowrap"><Download size={12} /> CSV</a>
          </div>
          <div className="flex flex-col gap-2">
            {users.map((u) => (
              <div key={u.id} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between">
                  <Link href={`/admin/users/${u.id}`} className="block hover:opacity-70 transition">
                    <p className="text-sm font-semibold text-slate-800">
                      {u.name} {u.role === "ADMIN" && <span className="text-[10px] bg-slate-700 text-white rounded-full px-1.5 py-0.5 ml-1">ADMIN</span>}
                      {u.bannedAt && <span className="text-[10px] bg-rose-100 text-rose-600 rounded-full px-1.5 py-0.5 ml-1">Suspendido</span>}
                    </p>
                    <p className="text-[11px] text-slate-400">{u.fullName} · {u.email} {u.phone && `· ${u.phone}`}</p>
                  </Link>
                  <div className="flex gap-1.5">
                    <button onClick={() => toggleBan(u.id, !u.bannedAt)} disabled={busyId === u.id}
                      className={`text-[11px] font-semibold px-2 py-1 rounded-full disabled:opacity-50 ${u.bannedAt ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-600"}`}>
                      {u.bannedAt ? "Reactivar" : "Suspender"}
                    </button>
                    {u.role !== "ADMIN" && (
                      <button onClick={() => deleteUser(u.id)} disabled={deleteBusyId === u.id}
                        className="text-[11px] font-semibold px-2 py-1 rounded-full bg-slate-700 text-white disabled:opacity-50 flex items-center gap-1">
                        <Trash2 size={11} /> Borrar
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 text-[11px] text-slate-400">
                  <span>{u.credits}✦ créditos</span>
                  <span>${u.balance.toFixed(2)} saldo</span>
                  {u.ratingCount > 0 && <span>★ {u.ratingAvg.toFixed(1)} ({u.ratingCount})</span>}
                  {u.isPremium && <span className="text-amber-600">Premium</span>}
                  {u.verified && <span className="text-blue-600">Verificado</span>}
                  <span>Desde {new Date(u.createdAt).toLocaleDateString("es-AR")}</span>
                </div>
              </div>
            ))}
            {users.length === 0 && <p className="text-sm text-slate-400 text-center py-8">Sin resultados.</p>}
          </div>
        </>
      )}

      {tab === "transacciones" && (
        <>
          <div className="flex items-center justify-end mb-3">
            <a href="/api/admin/transactions/export" className="flex items-center gap-1 text-xs text-slate-500 hover:text-rose-500"><Download size={12} /> CSV</a>
          </div>
          <div className="flex flex-col gap-2">
            {txs.map((t) => (
              <div key={t.id} className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm border border-slate-100">
                <div>
                  <p className="text-sm font-medium text-slate-700">{t.type}</p>
                  <p className="text-[11px] text-slate-400">{t.user.name} ({t.user.email}) · {new Date(t.createdAt).toLocaleString("es-AR")}</p>
                </div>
                <p className="text-sm font-bold text-slate-700">${t.amount.toFixed(2)}</p>
              </div>
            ))}
            {txs.length === 0 && <p className="text-sm text-slate-400 text-center py-8">Sin transacciones todavía.</p>}
          </div>
        </>
      )}

      {tab === "herramientas" && (
        <>
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

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4">
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

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4">
            <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-2"><Zap size={13} /> Acreditar créditos manualmente</p>
            <p className="text-[11px] text-slate-400 mb-2">Usalo cuando confirmes en MercadoPago que llegó una transferencia y todavía no está automatizado el alta de créditos.</p>
            <div className="flex flex-col gap-2">
              <input value={grantEmail} onChange={(e) => setGrantEmail(e.target.value)} placeholder="email@ejemplo.com"
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300" />
              <div className="flex gap-2">
                <input value={grantCredits} onChange={(e) => setGrantCredits(e.target.value)} placeholder="Créditos (ej: 30)" type="number"
                  className="w-28 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300" />
                <input value={grantNote} onChange={(e) => setGrantNote(e.target.value)} placeholder="Nota (opcional, ej: transferencia MP #123)"
                  className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300" />
              </div>
              <button onClick={handleGrantCredits} disabled={grantBusy || !grantEmail.trim() || !grantCredits}
                className="text-xs bg-slate-700 text-white font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-50 self-start">
                {grantBusy ? "..." : "Acreditar"}
              </button>
            </div>
            {grantMsg && <p className="text-[11px] text-slate-500 mt-1.5">{grantMsg}</p>}
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4">
            <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-2"><Crown size={13} /> Otorgar Premium manualmente</p>
            <p className="text-[11px] text-slate-400 mb-2">Para casos que pagaron por fuera de la app, o cortesías. Extiende el vencimiento si ya es Premium.</p>
            <div className="flex flex-col gap-2">
              <input value={premiumEmail} onChange={(e) => setPremiumEmail(e.target.value)} placeholder="email@ejemplo.com"
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300" />
              <div className="flex items-center gap-2">
                <input value={premiumDays} onChange={(e) => setPremiumDays(e.target.value)} placeholder="Días" type="number"
                  className="w-24 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300" />
                <label className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <input type="checkbox" checked={premiumVerified} onChange={(e) => setPremiumVerified(e.target.checked)} className="accent-rose-500" />
                  Incluir insignia verificada
                </label>
              </div>
              <button onClick={handleGrantPremium} disabled={premiumBusy || !premiumEmail.trim() || !premiumDays}
                className="text-xs bg-amber-500 text-white font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-50 self-start">
                {premiumBusy ? "..." : "Otorgar Premium"}
              </button>
            </div>
            {premiumMsg && <p className="text-[11px] text-slate-500 mt-1.5">{premiumMsg}</p>}
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4">
            <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-2"><Gift size={13} /> Promos y sorteos</p>
            <div className="flex flex-col gap-2">
              <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
                <button onClick={() => setPromoMode("ALL")} className={`text-[11px] font-semibold px-2.5 py-1 rounded-md ${promoMode === "ALL" ? "bg-white shadow-sm text-rose-500" : "text-slate-500"}`}>A todos</button>
                <button onClick={() => setPromoMode("RAFFLE")} className={`text-[11px] font-semibold px-2.5 py-1 rounded-md ${promoMode === "RAFFLE" ? "bg-white shadow-sm text-rose-500" : "text-slate-500"}`}>Sorteo (1 ganador)</button>
              </div>
              <div className="flex gap-2">
                <input value={promoCredits} onChange={(e) => setPromoCredits(e.target.value)} placeholder="Créditos" type="number"
                  className="w-28 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300" />
                <input value={promoNote} onChange={(e) => setPromoNote(e.target.value)} placeholder="Nota (ej: promo verano 2026)"
                  className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300" />
              </div>
              <button onClick={handlePromo} disabled={promoBusy || !promoCredits}
                className="text-xs bg-violet-500 text-white font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-50 self-start">
                {promoBusy ? "..." : promoMode === "ALL" ? "Acreditar a todos" : "Sortear"}
              </button>
            </div>
            {promoMsg && <p className="text-[11px] text-slate-500 mt-1.5">{promoMsg}</p>}
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4">
            <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-2"><ShieldOff size={13} /> Lista negra de emails</p>
            <p className="text-[11px] text-slate-400 mb-2">Impide que un email vuelva a registrarse, aunque no tenga cuenta o ya se le haya borrado la cuenta.</p>
            <div className="flex gap-2 mb-3">
              <input value={blacklistEmail} onChange={(e) => setBlacklistEmail(e.target.value)} placeholder="email@ejemplo.com"
                className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300" />
              <input value={blacklistReason} onChange={(e) => setBlacklistReason(e.target.value)} placeholder="Motivo (opcional)"
                className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300" />
              <button onClick={handleAddBlacklist} disabled={blacklistBusy || !blacklistEmail.trim()}
                className="text-xs bg-rose-600 text-white font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-50">Bloquear</button>
            </div>
            {blacklistMsg && <p className="text-[11px] text-rose-500 mb-2">{blacklistMsg}</p>}
            <div className="flex flex-col gap-1.5">
              {blacklist.map((b) => (
                <div key={b.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-xs">
                  <div>
                    <p className="text-slate-700 font-medium">{b.email}</p>
                    {b.reason && <p className="text-slate-400">{b.reason}</p>}
                  </div>
                  <button onClick={() => handleRemoveBlacklist(b.id)} disabled={blacklistBusy}
                    className="text-slate-400 hover:text-rose-500 disabled:opacity-50">
                    <X size={13} />
                  </button>
                </div>
              ))}
              {blacklist.length === 0 && <p className="text-xs text-slate-400 text-center py-2">Sin emails bloqueados.</p>}
            </div>
          </div>
        </>
      )}

      {tab === "seo" && (
        <div className="flex flex-col gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-600 mb-2">Archivos técnicos en vivo</p>
            <div className="flex flex-col gap-1.5 text-xs">
              <a href="https://ropinder.vercel.app/robots.txt" target="_blank" rel="noreferrer" className="text-rose-500 hover:underline">/robots.txt →</a>
              <a href="https://ropinder.vercel.app/sitemap.xml" target="_blank" rel="noreferrer" className="text-rose-500 hover:underline">/sitemap.xml →</a>
              <a href="https://ropinder.vercel.app/llms.txt" target="_blank" rel="noreferrer" className="text-rose-500 hover:underline">/llms.txt →</a>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-600 mb-2">Contenido actual de /llms.txt</p>
            <p className="text-[11px] text-slate-400 mb-2">Es un archivo estático (public/llms.txt) — para cambiarlo hay que editar el código y redeployar, avisame qué querés que diga.</p>
            <pre className="text-[11px] text-slate-600 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap max-h-64 overflow-y-auto">{llmsTxt || "Cargando..."}</pre>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-600 mb-2">Estado</p>
            <ul className="text-xs text-slate-500 flex flex-col gap-1.5 list-disc list-inside">
              <li>Metadata y Open Graph configurados en el layout principal.</li>
              <li>La mayoría de las páginas (swipe, matches, perfil) requieren login, así que no son indexables — es esperado en un marketplace privado.</li>
              <li><code className="bg-slate-100 px-1 rounded">/login</code>, <code className="bg-slate-100 px-1 rounded">/signup</code> y <code className="bg-slate-100 px-1 rounded">/premium</code> son las páginas públicas indexables hoy.</li>
              <li>Si querés más páginas públicas indexables (por ejemplo, perfiles de vendedor en modo tienda), avisame y lo armamos.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string | number; tone?: "rose" | "amber" | "emerald" | "blue" }) {
  const toneClasses: Record<string, string> = {
    rose: "bg-rose-50 border-rose-100 text-rose-700",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    blue: "bg-blue-50 border-blue-100 text-blue-700",
  };
  return (
    <div className={`rounded-2xl p-3 border ${tone ? toneClasses[tone] : "bg-slate-50 border-slate-100 text-slate-700"}`}>
      <p className="text-lg font-extrabold">{value}</p>
      <p className="text-[11px] opacity-80">{label}</p>
    </div>
  );
}
