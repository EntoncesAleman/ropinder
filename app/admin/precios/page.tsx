"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, Panel, TableWrap, Th, Td, Badge, FilterSelect } from "@/components/admin/ui";

interface PackRow {
  id: string;
  price: number;
  defaultPrice: number;
  currency: string;
  credits: number;
  premium: boolean;
  verified: boolean;
  days: number | null;
}

const LABELS: Record<string, string> = {
  credits_10: "10 créditos",
  credits_30: "30 créditos",
  credits_100: "100 créditos",
  verified_badge: "Insignia verificada",
  premium_daily: "Premium — 1 día",
  premium_weekly: "Premium — 1 semana",
  premium_monthly: "Premium — 1 mes",
  premium_yearly: "Premium — 1 año",
};

const inputCls = "w-28 border border-slate-200 rounded-md px-2.5 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-rose-200";

export default function PreciosPage() {
  const { user } = useAuth();
  const [accountType, setAccountType] = useState<"PERSONAL" | "STORE">("PERSONAL");
  const [packs, setPacks] = useState<PackRow[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const fetchPacks = useCallback(async (type: "PERSONAL" | "STORE") => {
    const res = await fetch(`/api/admin/pricing?accountType=${type}`);
    if (res.ok) {
      const data: PackRow[] = await res.json();
      setPacks(data);
      setEdits(Object.fromEntries(data.map((p) => [p.id, String(p.price)])));
    }
  }, []);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    Promise.resolve().then(() => fetchPacks(accountType));
  }, [user, accountType, fetchPacks]);

  async function handleSave() {
    setBusy(true); setMsg(""); setErr("");
    const changed = Object.fromEntries(
      packs.filter((p) => Number(edits[p.id]) !== p.price).map((p) => [p.id, Number(edits[p.id])])
    );
    if (Object.keys(changed).length === 0) { setBusy(false); setMsg("Nada para guardar."); return; }

    const res = await fetch(`/api/admin/pricing?accountType=${accountType}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prices: changed }),
    });
    const data = await res.json();
    if (res.ok) { setMsg("Guardado — aplica a partir de la próxima compra."); await fetchPacks(accountType); }
    else setErr(data.error ?? "Error");
    setBusy(false);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title="Precios" subtitle="Precios en ARS de créditos, insignia verificada y planes Premium." />

      <div className="mb-4">
        <FilterSelect value={accountType} onChange={(e) => setAccountType(e.target.value as "PERSONAL" | "STORE")}>
          <option value="PERSONAL">Usuarios personales</option>
          <option value="STORE">Tiendas</option>
        </FilterSelect>
        {accountType === "STORE" && (
          <p className="text-xs text-slate-400 mt-1.5">
            Si no se edita un precio acá, la tienda paga lo mismo que un usuario personal — esto sobreescribe solo lo que cambies.
          </p>
        )}
      </div>

      <Panel className="p-0 mb-4">
        <TableWrap>
          <thead>
            <tr>
              <Th>Producto</Th>
              <Th className="text-right">Precio actual</Th>
              <Th className="text-right">Nuevo precio</Th>
            </tr>
          </thead>
          <tbody>
            {packs.map((p) => (
              <tr key={p.id}>
                <Td>
                  <p className="font-medium text-slate-700">{LABELS[p.id] ?? p.id}</p>
                  {p.price !== p.defaultPrice && <Badge tone="amber">Editado</Badge>}
                </Td>
                <Td className="text-right text-slate-400 tabular-nums">${p.price.toLocaleString("es-AR")}</Td>
                <Td className="text-right">
                  <input
                    value={edits[p.id] ?? ""}
                    onChange={(e) => setEdits((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    type="number" step="1" min="0" className={inputCls}
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Panel>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={busy || packs.length === 0} className="text-sm font-semibold bg-slate-700 text-white rounded-md px-4 py-2 disabled:opacity-50">
          {busy ? "Guardando..." : "Guardar cambios"}
        </button>
        {msg && <p className="text-xs text-emerald-600">{msg}</p>}
        {err && <p className="text-xs text-rose-500">{err}</p>}
      </div>
    </div>
  );
}
