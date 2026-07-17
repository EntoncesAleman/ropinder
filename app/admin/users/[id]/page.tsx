"use client";
import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, Ban, Undo2, Trash2, Crown, Zap, KeyRound, UserCog, ShieldOff,
  Star, BadgeCheck, MapPin, Phone, Mail, Calendar, Receipt, Shirt, Flag,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface UserDetail {
  id: string; name: string; fullName: string; email: string; phone: string; address: string;
  avatar: string; bio: string; role: string; bannedAt: string | null; isPremium: boolean;
  premiumUntil: string | null; premiumPlan: string | null; credits: number; balance: number;
  ratingAvg: number; ratingCount: number; verified: boolean; emailVerified: boolean;
  termsAcceptedAt: string | null; createdAt: string;
}
interface Item { id: string; title: string; brand: string; price: number | null; archived: boolean; soldAt: string | null; createdAt: string }
interface Tx { id: string; type: string; amount: number; status: string; createdAt: string }
interface Detail { user: UserDetail; items: Item[]; transactions: Tx[]; matchesCount: number; reportsReceivedCount: number }

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user: admin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [premiumDays, setPremiumDays] = useState("30");
  const [premiumVerified, setPremiumVerified] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditNote, setCreditNote] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  const fetchDetail = useCallback(async () => {
    const res = await fetch(`/api/admin/users/${id}`);
    if (res.ok) setData(await res.json());
    else setError((await res.json()).error ?? "Error");
  }, [id]);

  useEffect(() => {
    if (!authLoading && admin?.role !== "ADMIN") { router.push("/"); return; }
    if (admin?.role === "ADMIN") fetchDetail();
  }, [admin, authLoading, router, fetchDetail]);

  async function toggleBan(banned: boolean) {
    setBusy(true);
    await fetch(`/api/admin/users/${id}/ban`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ banned }),
    });
    await fetchDetail();
    setBusy(false);
  }

  async function handleDelete() {
    if (!data) return;
    if (!confirm(`¿Borrar a ${data.user.name} para siempre, junto con todo lo que publicó? No se puede deshacer.`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/users/${id}/delete`, { method: "POST" });
    if (res.ok) router.push("/admin");
    else { setError((await res.json()).error ?? "Error"); setBusy(false); }
  }

  async function handleGrantPremium() {
    if (!data) return;
    setBusy(true); setActionMsg("");
    const res = await fetch("/api/admin/grant-premium", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.user.email, days: Number(premiumDays), verified: premiumVerified }),
    });
    const d = await res.json();
    setActionMsg(res.ok ? `Premium hasta ${new Date(d.user.premiumUntil).toLocaleDateString("es-AR")}` : d.error);
    if (res.ok) await fetchDetail();
    setBusy(false);
  }

  async function handleGrantCredits() {
    if (!data || !creditAmount) return;
    setBusy(true); setActionMsg("");
    const res = await fetch("/api/admin/grant-credits", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.user.email, credits: Number(creditAmount), note: creditNote }),
    });
    const d = await res.json();
    setActionMsg(res.ok ? `${creditAmount}✦ acreditados` : d.error);
    if (res.ok) { setCreditAmount(""); setCreditNote(""); await fetchDetail(); }
    setBusy(false);
  }

  async function handleResetPassword() {
    if (!data || newPassword.length < 6) return;
    setBusy(true); setActionMsg("");
    const res = await fetch("/api/admin/reset-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.user.email, newPassword }),
    });
    const d = await res.json();
    setActionMsg(res.ok ? "Contraseña actualizada ✓" : d.error);
    if (res.ok) setNewPassword("");
    setBusy(false);
  }

  async function handleTogglePremiumRole(role: "ADMIN" | "USER") {
    if (!data) return;
    setBusy(true); setActionMsg("");
    const res = await fetch("/api/admin/promote", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.user.email, role }),
    });
    const d = await res.json();
    if (res.ok) await fetchDetail();
    else setActionMsg(d.error);
    setBusy(false);
  }

  async function handleBlockEmail() {
    if (!data) return;
    if (!confirm(`¿Bloquear ${data.user.email} para que no pueda volver a registrarse?`)) return;
    setBusy(true); setActionMsg("");
    const res = await fetch("/api/admin/blacklist", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.user.email, reason: blockReason }),
    });
    const d = await res.json();
    setActionMsg(res.ok ? "Email bloqueado ✓" : d.error);
    setBusy(false);
  }

  if (authLoading || !data) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">{error || "Cargando..."}</div>;

  const { user: u, items, transactions, matchesCount, reportsReceivedCount } = data;

  return (
    <div className="max-w-sm mx-auto px-4 pt-6 pb-10">
      <Link href="/admin" className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-sm mb-4">
        <ArrowLeft size={14} /> Volver al panel
      </Link>

      <div className="flex items-center gap-3 mb-4">
        <Image src={u.avatar} alt={u.name} width={64} height={64} className="rounded-2xl object-cover border-2 border-rose-100" />
        <div>
          <p className="font-bold text-slate-800 text-lg flex items-center gap-1.5">
            {u.name}
            {u.role === "ADMIN" && <span className="text-[10px] bg-slate-700 text-white rounded-full px-1.5 py-0.5">ADMIN</span>}
            {u.bannedAt && <span className="text-[10px] bg-rose-100 text-rose-600 rounded-full px-1.5 py-0.5">Suspendido</span>}
            {u.verified && <BadgeCheck size={14} className="text-blue-500" />}
            {u.isPremium && <Crown size={13} className="text-amber-500" />}
          </p>
          <p className="text-xs text-slate-500">{u.fullName}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-3 flex flex-col gap-2 text-sm text-slate-600">
        <div className="flex items-center gap-2"><Mail size={14} className="text-slate-400" /> {u.email}</div>
        {u.phone && <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /> {u.phone}</div>}
        {u.address && <div className="flex items-center gap-2"><MapPin size={14} className="text-slate-400" /> {u.address}</div>}
        <div className="flex items-center gap-2"><Calendar size={14} className="text-slate-400" /> Registrado el {new Date(u.createdAt).toLocaleDateString("es-AR")}</div>
        {u.ratingCount > 0 && <div className="flex items-center gap-2"><Star size={14} className="text-amber-500" fill="currentColor" /> {u.ratingAvg.toFixed(1)} ({u.ratingCount} calificaciones)</div>}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-2.5 text-center">
          <p className="text-lg font-extrabold text-amber-700">{u.credits}</p>
          <p className="text-[10px] text-amber-600">Créditos</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 text-center">
          <p className="text-lg font-extrabold text-emerald-700">${u.balance.toFixed(0)}</p>
          <p className="text-[10px] text-emerald-600">Monedero</p>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
          <p className="text-lg font-extrabold text-slate-700">{matchesCount}</p>
          <p className="text-[10px] text-slate-500">Matches</p>
        </div>
      </div>

      {reportsReceivedCount > 0 && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 mb-3 text-xs text-rose-600">
          <Flag size={13} /> Recibió {reportsReceivedCount} reporte{reportsReceivedCount !== 1 ? "s" : ""}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mb-4">
        <button onClick={() => toggleBan(!u.bannedAt)} disabled={busy}
          className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full disabled:opacity-50 ${u.bannedAt ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-600"}`}>
          {u.bannedAt ? <Undo2 size={12} /> : <Ban size={12} />} {u.bannedAt ? "Reactivar" : "Suspender"}
        </button>
        {u.role !== "ADMIN" && (
          <button onClick={handleDelete} disabled={busy} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full bg-slate-700 text-white disabled:opacity-50">
            <Trash2 size={12} /> Borrar cuenta
          </button>
        )}
        {u.id !== admin?.id && (
          <button onClick={() => handleTogglePremiumRole(u.role === "ADMIN" ? "USER" : "ADMIN")} disabled={busy}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full bg-slate-100 text-slate-600 disabled:opacity-50">
            <UserCog size={12} /> {u.role === "ADMIN" ? "Quitar admin" : "Dar admin"}
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-3">
        <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-2"><Crown size={13} /> Otorgar Premium</p>
        <div className="flex items-center gap-2 mb-2">
          <input value={premiumDays} onChange={(e) => setPremiumDays(e.target.value)} type="number" placeholder="Días"
            className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300" />
          <label className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <input type="checkbox" checked={premiumVerified} onChange={(e) => setPremiumVerified(e.target.checked)} className="accent-rose-500" />
            + insignia verificada
          </label>
        </div>
        <button onClick={handleGrantPremium} disabled={busy || !premiumDays} className="text-xs bg-amber-500 text-white font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50">
          Otorgar
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-3">
        <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-2"><Zap size={13} /> Acreditar créditos</p>
        <div className="flex items-center gap-2 mb-2">
          <input value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} type="number" placeholder="Cantidad"
            className="w-24 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300" />
          <input value={creditNote} onChange={(e) => setCreditNote(e.target.value)} placeholder="Nota (opcional)"
            className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300" />
        </div>
        <button onClick={handleGrantCredits} disabled={busy || !creditAmount} className="text-xs bg-slate-700 text-white font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50">
          Acreditar
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-3">
        <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-2"><KeyRound size={13} /> Resetear contraseña</p>
        <div className="flex items-center gap-2">
          <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="text" placeholder="Contraseña nueva (mín. 6)"
            className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300" />
          <button onClick={handleResetPassword} disabled={busy || newPassword.length < 6} className="text-xs bg-slate-700 text-white font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50">
            Resetear
          </button>
        </div>
      </div>

      {u.role !== "ADMIN" && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-3">
          <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-2"><ShieldOff size={13} /> Bloquear email (lista negra)</p>
          <p className="text-[11px] text-slate-400 mb-2">Impide que este email vuelva a registrarse, aunque se borre la cuenta.</p>
          <div className="flex items-center gap-2">
            <input value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Motivo (opcional)"
              className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300" />
            <button onClick={handleBlockEmail} disabled={busy} className="text-xs bg-rose-600 text-white font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50">
              Bloquear
            </button>
          </div>
        </div>
      )}

      {actionMsg && <p className="text-xs text-slate-500 mb-3">{actionMsg}</p>}

      {items.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-2"><Shirt size={13} /> Prendas ({items.length})</p>
          <div className="flex flex-col gap-1.5">
            {items.slice(0, 10).map((i) => (
              <div key={i.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-xs border border-slate-100">
                <span className="text-slate-700 truncate">{i.title} <span className="text-slate-400">· {i.brand}</span></span>
                <span className={i.soldAt ? "text-emerald-600" : i.archived ? "text-slate-400" : "text-slate-500"}>
                  {i.soldAt ? "Vendida" : i.archived ? "Archivada" : "Activa"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {transactions.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-2"><Receipt size={13} /> Últimas transacciones</p>
          <div className="flex flex-col gap-1.5">
            {transactions.slice(0, 10).map((t) => (
              <div key={t.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-xs border border-slate-100">
                <span className="text-slate-600">{t.type}</span>
                <span className="text-slate-400">{new Date(t.createdAt).toLocaleDateString("es-AR")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
