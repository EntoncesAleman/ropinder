"use client";
import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Ban, Undo2, Trash2, Crown, Zap, KeyRound, UserCog, ShieldOff,
  Star, BadgeCheck, MapPin, Phone, Mail, Calendar, Receipt, Shirt, Flag,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, Panel, Badge, EmptyState } from "@/components/admin/ui";
import { useBreadcrumbExtra } from "@/components/admin/BreadcrumbContext";

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

const inputCls = "border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-200";
const btnCls = "text-xs font-semibold px-3 py-1.5 rounded-md disabled:opacity-50";

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user: admin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"perfil" | "prendas" | "transacciones">("perfil");

  const [premiumDays, setPremiumDays] = useState("30");
  const [premiumVerified, setPremiumVerified] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditNote, setCreditNote] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  useBreadcrumbExtra(data?.user.name ?? null);

  const fetchDetail = useCallback(async () => {
    const res = await fetch(`/api/admin/users/${id}`);
    if (res.ok) setData(await res.json());
    else setError((await res.json()).error ?? "Error");
  }, [id]);

  useEffect(() => {
    if (!authLoading && admin?.role !== "ADMIN") { router.push("/"); return; }
    if (admin?.role === "ADMIN") Promise.resolve().then(() => fetchDetail());
  }, [admin, authLoading, router, fetchDetail]);

  async function toggleBan(banned: boolean) {
    setBusy(true);
    await fetch(`/api/admin/users/${id}/ban`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ banned }) });
    await fetchDetail();
    setBusy(false);
  }

  async function handleDelete() {
    if (!data) return;
    if (!confirm(`¿Borrar a ${data.user.name} para siempre, junto con todo lo que publicó? No se puede deshacer.`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/users/${id}/delete`, { method: "POST" });
    if (res.ok) router.push("/admin/usuarios");
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
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: data.user.email, newPassword }),
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
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: data.user.email, role }),
    });
    const d = await res.json();
    if (res.ok) await fetchDetail(); else setActionMsg(d.error);
    setBusy(false);
  }

  async function handleBlockEmail() {
    if (!data) return;
    if (!confirm(`¿Bloquear ${data.user.email} para que no pueda volver a registrarse?`)) return;
    setBusy(true); setActionMsg("");
    const res = await fetch("/api/admin/blacklist", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: data.user.email, reason: blockReason }),
    });
    const d = await res.json();
    setActionMsg(res.ok ? "Email bloqueado ✓" : d.error);
    setBusy(false);
  }

  if (authLoading || !data) return <div className="text-slate-400 text-sm py-16 text-center">{error || "Cargando..."}</div>;

  const { user: u, items, transactions, matchesCount, reportsReceivedCount } = data;

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title={u.name}
        subtitle={u.fullName}
        actions={
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => toggleBan(!u.bannedAt)} disabled={busy}
              className={`flex items-center gap-1 ${btnCls} ${u.bannedAt ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-600"}`}>
              {u.bannedAt ? <Undo2 size={12} /> : <Ban size={12} />} {u.bannedAt ? "Reactivar" : "Suspender"}
            </button>
            {u.role !== "ADMIN" && (
              <button onClick={handleDelete} disabled={busy} className={`flex items-center gap-1 bg-slate-700 text-white ${btnCls}`}>
                <Trash2 size={12} /> Borrar cuenta
              </button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5 items-start">
        <div>
          <div className="flex items-center gap-1 border-b border-slate-200 mb-4">
            {(["perfil", "prendas", "transacciones"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px capitalize transition ${tab === t ? "border-rose-500 text-rose-600" : "border-transparent text-slate-500"}`}>
                {t === "perfil" ? "Perfil" : t === "prendas" ? `Prendas (${items.length})` : `Transacciones (${transactions.length})`}
              </button>
            ))}
          </div>

          {tab === "perfil" && (
            <div className="flex flex-col gap-3">
              <Panel className="p-4">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-100">
                  <Image src={u.avatar} alt={u.name} width={48} height={48} className="rounded-full object-cover border border-slate-200" />
                  <div className="flex flex-wrap items-center gap-1.5">
                    {u.role === "ADMIN" && <Badge tone="slate">ADMIN</Badge>}
                    {u.bannedAt && <Badge tone="rose">Suspendido</Badge>}
                    {u.verified && <Badge tone="blue"><BadgeCheck size={11} className="inline mr-0.5" />Verificado</Badge>}
                    {u.isPremium && <Badge tone="amber"><Crown size={11} className="inline mr-0.5" />Premium</Badge>}
                  </div>
                </div>
                <div className="flex flex-col gap-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2"><Mail size={14} className="text-slate-400" /> {u.email}</div>
                  {u.phone && <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /> {u.phone}</div>}
                  {u.address && <div className="flex items-center gap-2"><MapPin size={14} className="text-slate-400" /> {u.address}</div>}
                  <div className="flex items-center gap-2"><Calendar size={14} className="text-slate-400" /> Registrado el {new Date(u.createdAt).toLocaleDateString("es-AR")}</div>
                  {u.ratingCount > 0 && <div className="flex items-center gap-2"><Star size={14} className="text-amber-500" fill="currentColor" /> {u.ratingAvg.toFixed(1)} ({u.ratingCount} calificaciones)</div>}
                </div>
              </Panel>

              {reportsReceivedCount > 0 && (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 rounded-md px-3 py-2 text-xs text-rose-600">
                  <Flag size={13} /> Recibió {reportsReceivedCount} reporte{reportsReceivedCount !== 1 ? "s" : ""}
                </div>
              )}

              {u.id !== admin?.id && (
                <button onClick={() => handleTogglePremiumRole(u.role === "ADMIN" ? "USER" : "ADMIN")} disabled={busy}
                  className={`flex items-center gap-1 bg-slate-100 text-slate-600 self-start ${btnCls}`}>
                  <UserCog size={12} /> {u.role === "ADMIN" ? "Quitar admin" : "Dar admin"}
                </button>
              )}

              <Panel className="p-4">
                <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-2"><Crown size={13} /> Otorgar Premium</p>
                <div className="flex items-center gap-2 mb-2">
                  <input value={premiumDays} onChange={(e) => setPremiumDays(e.target.value)} type="number" placeholder="Días" className={`w-20 ${inputCls}`} />
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <input type="checkbox" checked={premiumVerified} onChange={(e) => setPremiumVerified(e.target.checked)} className="accent-rose-500" /> + insignia verificada
                  </label>
                </div>
                <button onClick={handleGrantPremium} disabled={busy || !premiumDays} className={`bg-amber-500 text-white ${btnCls}`}>Otorgar</button>
              </Panel>

              <Panel className="p-4">
                <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-2"><Zap size={13} /> Acreditar créditos</p>
                <div className="flex items-center gap-2 mb-2">
                  <input value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} type="number" placeholder="Cantidad" className={`w-24 ${inputCls}`} />
                  <input value={creditNote} onChange={(e) => setCreditNote(e.target.value)} placeholder="Nota (opcional)" className={`flex-1 ${inputCls}`} />
                </div>
                <button onClick={handleGrantCredits} disabled={busy || !creditAmount} className={`bg-slate-700 text-white ${btnCls}`}>Acreditar</button>
              </Panel>

              <Panel className="p-4">
                <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-2"><KeyRound size={13} /> Resetear contraseña</p>
                <div className="flex items-center gap-2">
                  <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="text" placeholder="Contraseña nueva (mín. 8)" className={`flex-1 ${inputCls}`} />
                  <button onClick={handleResetPassword} disabled={busy || newPassword.length < 6} className={`bg-slate-700 text-white ${btnCls}`}>Resetear</button>
                </div>
              </Panel>

              {u.role !== "ADMIN" && (
                <Panel className="p-4">
                  <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-2"><ShieldOff size={13} /> Bloquear email (lista negra)</p>
                  <p className="text-[11px] text-slate-400 mb-2">Impide que este email vuelva a registrarse, aunque se borre la cuenta.</p>
                  <div className="flex items-center gap-2">
                    <input value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Motivo (opcional)" className={`flex-1 ${inputCls}`} />
                    <button onClick={handleBlockEmail} disabled={busy} className={`bg-rose-600 text-white ${btnCls}`}>Bloquear</button>
                  </div>
                </Panel>
              )}

              {actionMsg && <p className="text-xs text-slate-500">{actionMsg}</p>}
            </div>
          )}

          {tab === "prendas" && (
            items.length === 0 ? <Panel><EmptyState title="Sin prendas publicadas" /></Panel> : (
              <Panel className="divide-y divide-slate-100">
                {items.map((i) => (
                  <div key={i.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-slate-700 truncate">{i.title} <span className="text-slate-400">· {i.brand}</span></span>
                    {i.soldAt ? <Badge tone="emerald">Vendida</Badge> : i.archived ? <Badge>Archivada</Badge> : <Badge tone="blue">Activa</Badge>}
                  </div>
                ))}
              </Panel>
            )
          )}

          {tab === "transacciones" && (
            transactions.length === 0 ? <Panel><EmptyState title="Sin transacciones" /></Panel> : (
              <Panel className="divide-y divide-slate-100">
                {transactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-slate-600">{t.type}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-700 tabular-nums">${t.amount.toFixed(2)}</span>
                      <span className="text-slate-400 text-xs">{new Date(t.createdAt).toLocaleDateString("es-AR")}</span>
                    </div>
                  </div>
                ))}
              </Panel>
            )
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Panel className="p-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-base font-bold text-slate-800 tabular-nums">{u.credits}</p>
              <p className="text-[10px] text-slate-400">Créditos</p>
            </div>
            <div>
              <p className="text-base font-bold text-slate-800 tabular-nums">${u.balance.toFixed(0)}</p>
              <p className="text-[10px] text-slate-400">Monedero</p>
            </div>
            <div>
              <p className="text-base font-bold text-slate-800 tabular-nums">{matchesCount}</p>
              <p className="text-[10px] text-slate-400">Matches</p>
            </div>
          </Panel>
          <Panel className="p-3 flex items-center gap-2">
            <Shirt size={14} className="text-slate-400" />
            <span className="text-xs text-slate-600">{items.length} publicaciones</span>
          </Panel>
          <Panel className="p-3 flex items-center gap-2">
            <Receipt size={14} className="text-slate-400" />
            <span className="text-xs text-slate-600">{transactions.length} transacciones</span>
          </Panel>
        </div>
      </div>
    </div>
  );
}
