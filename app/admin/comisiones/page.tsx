"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, Panel } from "@/components/admin/ui";

interface ConfigResponse {
  commissionStandard: number;
  commissionPremium: number;
  withdrawalFeeRate: number;
  rateCap: number;
}

const inputCls = "w-24 border border-slate-200 rounded-md px-2.5 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-rose-200";

// Rates are stored as fractions (0.08) but edited as whole percentages (8)
// — less error-prone for an admin typing into a field.
function toPercent(rate: number): string {
  return (rate * 100).toFixed(2).replace(/\.?0+$/, "");
}
function fromPercent(pct: string): number {
  return Number(pct) / 100;
}

interface VipConfigResponse {
  vipPublishCost: number;
  vipUnlockCost: number;
}

export default function ComisionesPage() {
  const { user } = useAuth();
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [standardPct, setStandardPct] = useState("");
  const [premiumPct, setPremiumPct] = useState("");
  const [feePct, setFeePct] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [vipConfig, setVipConfig] = useState<VipConfigResponse | null>(null);
  const [publishCost, setPublishCost] = useState("");
  const [unlockCost, setUnlockCost] = useState("");
  const [vipBusy, setVipBusy] = useState(false);
  const [vipMsg, setVipMsg] = useState("");
  const [vipErr, setVipErr] = useState("");

  const fetchConfig = useCallback(async () => {
    const res = await fetch("/api/admin/config");
    if (res.ok) {
      const data: ConfigResponse = await res.json();
      setConfig(data);
      setStandardPct(toPercent(data.commissionStandard));
      setPremiumPct(toPercent(data.commissionPremium));
      setFeePct(toPercent(data.withdrawalFeeRate));
    }
  }, []);

  const fetchVipConfig = useCallback(async () => {
    const res = await fetch("/api/admin/vip-config");
    if (res.ok) {
      const data: VipConfigResponse = await res.json();
      setVipConfig(data);
      setPublishCost(String(data.vipPublishCost));
      setUnlockCost(String(data.vipUnlockCost));
    }
  }, []);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    Promise.resolve().then(() => { fetchConfig(); fetchVipConfig(); });
  }, [user, fetchConfig, fetchVipConfig]);

  async function handleSave() {
    setBusy(true); setMsg(""); setErr("");
    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commissionStandard: fromPercent(standardPct),
        commissionPremium: fromPercent(premiumPct),
        withdrawalFeeRate: fromPercent(feePct),
      }),
    });
    const data = await res.json();
    if (res.ok) { setMsg("Guardado — aplica a partir de la próxima operación, no afecta las ya cerradas."); await fetchConfig(); }
    else setErr(data.error ?? "Error");
    setBusy(false);
  }

  async function handleSaveVip() {
    setVipBusy(true); setVipMsg(""); setVipErr("");
    const res = await fetch("/api/admin/vip-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vipPublishCost: Number(publishCost), vipUnlockCost: Number(unlockCost) }),
    });
    const data = await res.json();
    if (res.ok) { setVipMsg("Guardado."); await fetchVipConfig(); }
    else setVipErr(data.error ?? "Error");
    setVipBusy(false);
  }

  if (!config || !vipConfig) return null;

  const capPct = config.rateCap * 100;

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title="Comisiones" subtitle="Tasas que cobra Ropinder por cada venta y por cada retiro." />

      <Panel className="p-5 mb-4">
        <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-4 items-center">
          <div>
            <p className="text-sm font-semibold text-slate-700">Comisión estándar</p>
            <p className="text-xs text-slate-400">Vendedores sin Premium.</p>
          </div>
          <div className="flex items-center gap-1">
            <input value={standardPct} onChange={(e) => setStandardPct(e.target.value)} type="number" step="0.1" min="0" max={capPct} className={inputCls} />
            <span className="text-sm text-slate-500">%</span>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700">Comisión Premium</p>
            <p className="text-xs text-slate-400">Vendedores con suscripción Premium activa.</p>
          </div>
          <div className="flex items-center gap-1">
            <input value={premiumPct} onChange={(e) => setPremiumPct(e.target.value)} type="number" step="0.1" min="0" max={capPct} className={inputCls} />
            <span className="text-sm text-slate-500">%</span>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700">Fee de retiro anticipado</p>
            <p className="text-xs text-slate-400">Se cobra solo si el retiro se pide dentro de las 24hs de liberado el pago.</p>
          </div>
          <div className="flex items-center gap-1">
            <input value={feePct} onChange={(e) => setFeePct(e.target.value)} type="number" step="0.1" min="0" max={capPct} className={inputCls} />
            <span className="text-sm text-slate-500">%</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 mt-4 border-t border-slate-100 pt-3">
          Techo absoluto: {capPct}%. Ningún valor puede guardarse por encima de ese límite. Los vendedores Premium además
          esperan 2 días en vez de 3 para tener su plata libre de fee (fijo en código, no editable acá).
        </p>

        <div className="flex items-center gap-3 mt-4">
          <button onClick={handleSave} disabled={busy} className="text-sm font-semibold bg-slate-700 text-white rounded-md px-4 py-2 disabled:opacity-50">
            {busy ? "Guardando..." : "Guardar cambios"}
          </button>
          {msg && <p className="text-xs text-emerald-600">{msg}</p>}
          {err && <p className="text-xs text-rose-500">{err}</p>}
        </div>
      </Panel>

      <Panel className="p-5">
        <h2 className="text-sm font-bold text-slate-800 mb-1">Créditos VIP</h2>
        <p className="text-xs text-slate-400 mb-4">
          Publicar como VIP salta la vidriera del swipe; desbloquear una VIP crea el match directo, sin esperar mutuo like.
        </p>
        <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-4 items-center">
          <div>
            <p className="text-sm font-semibold text-slate-700">Costo de publicar VIP</p>
            <p className="text-xs text-slate-400">Lo paga el vendedor, en créditos.</p>
          </div>
          <div className="flex items-center gap-1">
            <input value={publishCost} onChange={(e) => setPublishCost(e.target.value)} type="number" step="1" min="0" className={inputCls} />
            <span className="text-sm text-slate-500">créditos</span>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700">Costo de desbloquear VIP</p>
            <p className="text-xs text-slate-400">Lo paga el comprador, en créditos.</p>
          </div>
          <div className="flex items-center gap-1">
            <input value={unlockCost} onChange={(e) => setUnlockCost(e.target.value)} type="number" step="1" min="0" className={inputCls} />
            <span className="text-sm text-slate-500">créditos</span>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button onClick={handleSaveVip} disabled={vipBusy} className="text-sm font-semibold bg-slate-700 text-white rounded-md px-4 py-2 disabled:opacity-50">
            {vipBusy ? "Guardando..." : "Guardar cambios"}
          </button>
          {vipMsg && <p className="text-xs text-emerald-600">{vipMsg}</p>}
          {vipErr && <p className="text-xs text-rose-500">{vipErr}</p>}
        </div>
      </Panel>
    </div>
  );
}
