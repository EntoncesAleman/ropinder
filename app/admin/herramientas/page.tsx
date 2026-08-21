"use client";
import { useEffect, useState, useCallback } from "react";
import { UserCog, KeyRound, Zap, Crown, Gift, ShieldOff, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, Panel } from "@/components/admin/ui";

const inputCls = "border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-200";
const btnCls = "text-xs font-semibold px-2.5 py-1.5 rounded-md disabled:opacity-50";

export default function HerramientasPage() {
  const { user } = useAuth();

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
  const [blacklist, setBlacklist] = useState<{ id: string; email: string; reason: string; blockedBy: string; createdAt: string }[]>([]);
  const [blacklistEmail, setBlacklistEmail] = useState("");
  const [blacklistReason, setBlacklistReason] = useState("");
  const [blacklistMsg, setBlacklistMsg] = useState("");
  const [blacklistBusy, setBlacklistBusy] = useState(false);

  const fetchBlacklist = useCallback(async () => {
    const res = await fetch("/api/admin/blacklist");
    if (res.ok) setBlacklist(await res.json());
  }, []);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    Promise.resolve().then(() => fetchBlacklist());
  }, [user, fetchBlacklist]);

  async function handlePromote(role: "ADMIN" | "USER") {
    setPromoteBusy(true); setPromoteMsg("");
    const res = await fetch("/api/admin/promote", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: promoteEmail.trim(), role }),
    });
    const data = await res.json();
    setPromoteMsg(res.ok ? `${data.user.email} ahora es ${role}` : data.error);
    if (res.ok) setPromoteEmail("");
    setPromoteBusy(false);
  }

  async function handleResetPassword() {
    setResetBusy(true); setResetMsg("");
    const res = await fetch("/api/admin/reset-password", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: resetEmail.trim(), newPassword: resetPassword }),
    });
    const data = await res.json();
    setResetMsg(res.ok ? "Contraseña actualizada ✓" : data.error);
    if (res.ok) { setResetEmail(""); setResetPassword(""); }
    setResetBusy(false);
  }

  async function handleGrantCredits() {
    setGrantBusy(true); setGrantMsg("");
    const res = await fetch("/api/admin/grant-credits", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: grantEmail.trim(), credits: Number(grantCredits), note: grantNote }),
    });
    const data = await res.json();
    setGrantMsg(res.ok ? `${grantCredits}✦ acreditados a ${data.user.email} (ahora tiene ${data.user.credits}✦)` : data.error);
    if (res.ok) { setGrantEmail(""); setGrantCredits(""); setGrantNote(""); }
    setGrantBusy(false);
  }

  async function handleGrantPremium() {
    setPremiumBusy(true); setPremiumMsg("");
    const res = await fetch("/api/admin/grant-premium", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: premiumEmail.trim(), days: Number(premiumDays), verified: premiumVerified }),
    });
    const data = await res.json();
    setPremiumMsg(res.ok ? `${data.user.email} es Premium hasta ${new Date(data.user.premiumUntil).toLocaleDateString("es-AR")}` : data.error);
    if (res.ok) setPremiumEmail("");
    setPremiumBusy(false);
  }

  async function handlePromo() {
    setPromoBusy(true); setPromoMsg("");
    const res = await fetch("/api/admin/promo", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: promoMode, credits: Number(promoCredits), note: promoNote }),
    });
    const data = await res.json();
    if (!res.ok) setPromoMsg(data.error);
    else if (promoMode === "ALL") setPromoMsg(`${promoCredits}✦ acreditados a ${data.usersAffected} usuarios`);
    else setPromoMsg(`🎉 Ganador del sorteo: ${data.winnerEmail} (entre ${data.poolSize} usuarios) — ${promoCredits}✦ acreditados`);
    if (res.ok) { setPromoCredits(""); setPromoNote(""); }
    setPromoBusy(false);
  }

  async function handleAddBlacklist() {
    setBlacklistBusy(true); setBlacklistMsg("");
    const res = await fetch("/api/admin/blacklist", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: blacklistEmail.trim(), reason: blacklistReason }),
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

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title="Herramientas" subtitle="Acciones administrativas directas sobre cuentas y créditos." />

      <div className="flex flex-col gap-3">
        <Panel className="p-4">
          <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-2"><UserCog size={13} /> Otorgar / quitar admin</p>
          <div className="flex gap-2">
            <input value={promoteEmail} onChange={(e) => setPromoteEmail(e.target.value)} placeholder="email@ejemplo.com" className={`flex-1 ${inputCls}`} />
            <button onClick={() => handlePromote("ADMIN")} disabled={promoteBusy || !promoteEmail.trim()} className={`bg-slate-700 text-white ${btnCls}`}>Dar admin</button>
            <button onClick={() => handlePromote("USER")} disabled={promoteBusy || !promoteEmail.trim()} className={`bg-slate-100 text-slate-600 ${btnCls}`}>Quitar</button>
          </div>
          {promoteMsg && <p className="text-[11px] text-slate-500 mt-1.5">{promoteMsg}</p>}
        </Panel>

        <Panel className="p-4">
          <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-2"><KeyRound size={13} /> Resetear contraseña de un usuario</p>
          <div className="flex flex-col gap-2">
            <input value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="email@ejemplo.com" className={inputCls} />
            <div className="flex gap-2">
              <input value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="Contraseña nueva (mín. 8)" type="text" className={`flex-1 ${inputCls}`} />
              <button onClick={handleResetPassword} disabled={resetBusy || !resetEmail.trim() || resetPassword.length < 8} className={`bg-slate-700 text-white ${btnCls}`}>Resetear</button>
            </div>
          </div>
          {resetMsg && <p className="text-[11px] text-slate-500 mt-1.5">{resetMsg}</p>}
        </Panel>

        <Panel className="p-4">
          <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-2"><Zap size={13} /> Acreditar créditos manualmente</p>
          <p className="text-[11px] text-slate-400 mb-2">Usalo cuando confirmes en MercadoPago que llegó una transferencia y todavía no está automatizado el alta de créditos.</p>
          <div className="flex flex-col gap-2">
            <input value={grantEmail} onChange={(e) => setGrantEmail(e.target.value)} placeholder="email@ejemplo.com" className={inputCls} />
            <div className="flex gap-2">
              <input value={grantCredits} onChange={(e) => setGrantCredits(e.target.value)} placeholder="Créditos (ej: 30)" type="number" className={`w-28 ${inputCls}`} />
              <input value={grantNote} onChange={(e) => setGrantNote(e.target.value)} placeholder="Nota (opcional, ej: transferencia MP #123)" className={`flex-1 ${inputCls}`} />
            </div>
            <button onClick={handleGrantCredits} disabled={grantBusy || !grantEmail.trim() || !grantCredits} className={`bg-slate-700 text-white self-start ${btnCls}`}>
              {grantBusy ? "..." : "Acreditar"}
            </button>
          </div>
          {grantMsg && <p className="text-[11px] text-slate-500 mt-1.5">{grantMsg}</p>}
        </Panel>

        <Panel className="p-4">
          <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-2"><Crown size={13} /> Otorgar Premium manualmente</p>
          <p className="text-[11px] text-slate-400 mb-2">Para casos que pagaron por fuera de la app, o cortesías. Extiende el vencimiento si ya es Premium.</p>
          <div className="flex flex-col gap-2">
            <input value={premiumEmail} onChange={(e) => setPremiumEmail(e.target.value)} placeholder="email@ejemplo.com" className={inputCls} />
            <div className="flex items-center gap-2">
              <input value={premiumDays} onChange={(e) => setPremiumDays(e.target.value)} placeholder="Días" type="number" className={`w-24 ${inputCls}`} />
              <label className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <input type="checkbox" checked={premiumVerified} onChange={(e) => setPremiumVerified(e.target.checked)} className="accent-rose-500" />
                Incluir insignia verificada
              </label>
            </div>
            <button onClick={handleGrantPremium} disabled={premiumBusy || !premiumEmail.trim() || !premiumDays} className={`bg-amber-500 text-white self-start ${btnCls}`}>
              {premiumBusy ? "..." : "Otorgar Premium"}
            </button>
          </div>
          {premiumMsg && <p className="text-[11px] text-slate-500 mt-1.5">{premiumMsg}</p>}
        </Panel>

        <Panel className="p-4">
          <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-2"><Gift size={13} /> Promos y sorteos</p>
          <div className="flex flex-col gap-2">
            <div className="flex gap-1 bg-slate-100 rounded-md p-1 w-fit">
              <button onClick={() => setPromoMode("ALL")} className={`text-[11px] font-semibold px-2.5 py-1 rounded ${promoMode === "ALL" ? "bg-white shadow-sm text-rose-500" : "text-slate-500"}`}>A todos</button>
              <button onClick={() => setPromoMode("RAFFLE")} className={`text-[11px] font-semibold px-2.5 py-1 rounded ${promoMode === "RAFFLE" ? "bg-white shadow-sm text-rose-500" : "text-slate-500"}`}>Sorteo (1 ganador)</button>
            </div>
            <div className="flex gap-2">
              <input value={promoCredits} onChange={(e) => setPromoCredits(e.target.value)} placeholder="Créditos" type="number" className={`w-28 ${inputCls}`} />
              <input value={promoNote} onChange={(e) => setPromoNote(e.target.value)} placeholder="Nota (ej: promo verano 2026)" className={`flex-1 ${inputCls}`} />
            </div>
            <button onClick={handlePromo} disabled={promoBusy || !promoCredits} className={`bg-violet-500 text-white self-start ${btnCls}`}>
              {promoBusy ? "..." : promoMode === "ALL" ? "Acreditar a todos" : "Sortear"}
            </button>
          </div>
          {promoMsg && <p className="text-[11px] text-slate-500 mt-1.5">{promoMsg}</p>}
        </Panel>

        <Panel className="p-4">
          <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-2"><ShieldOff size={13} /> Lista negra de emails</p>
          <p className="text-[11px] text-slate-400 mb-2">Impide que un email vuelva a registrarse, aunque no tenga cuenta o ya se le haya borrado la cuenta.</p>
          <div className="flex gap-2 mb-3">
            <input value={blacklistEmail} onChange={(e) => setBlacklistEmail(e.target.value)} placeholder="email@ejemplo.com" className={`flex-1 ${inputCls}`} />
            <input value={blacklistReason} onChange={(e) => setBlacklistReason(e.target.value)} placeholder="Motivo (opcional)" className={`flex-1 ${inputCls}`} />
            <button onClick={handleAddBlacklist} disabled={blacklistBusy || !blacklistEmail.trim()} className={`bg-rose-600 text-white ${btnCls}`}>Bloquear</button>
          </div>
          {blacklistMsg && <p className="text-[11px] text-rose-500 mb-2">{blacklistMsg}</p>}
          <div className="flex flex-col gap-1.5">
            {blacklist.map((b) => (
              <div key={b.id} className="flex items-center justify-between bg-slate-50 rounded-md px-3 py-2 text-xs">
                <div>
                  <p className="text-slate-700 font-medium">{b.email}</p>
                  {b.reason && <p className="text-slate-400">{b.reason}</p>}
                </div>
                <button onClick={() => handleRemoveBlacklist(b.id)} disabled={blacklistBusy} className="text-slate-400 hover:text-rose-500 disabled:opacity-50">
                  <X size={13} />
                </button>
              </div>
            ))}
            {blacklist.length === 0 && <p className="text-xs text-slate-400 text-center py-2">Sin emails bloqueados.</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
