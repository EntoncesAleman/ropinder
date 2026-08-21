"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, Toolbar, FilterSelect, TableWrap, Th, Td, Badge, EmptyState, Panel } from "@/components/admin/ui";

interface AdminTx {
  id: string; amount: number; type: string; status: string; createdAt: string; meta: string;
  user: { id: string; name: string; email: string };
}

function parseMeta(meta: string): { paymentMethod?: string; receiptUrl?: string; payoutDestination?: string } {
  try { return JSON.parse(meta); } catch { return {}; }
}

export default function TransaccionesPage() {
  const { user } = useAuth();
  const [txs, setTxs] = useState<AdminTx[]>([]);
  const [filter, setFilter] = useState<"" | "review">("");
  const [approveBusyId, setApproveBusyId] = useState<string | null>(null);
  const [rejectBusyId, setRejectBusyId] = useState<string | null>(null);

  const fetchTxs = useCallback(async () => {
    const res = await fetch("/api/admin/transactions");
    if (res.ok) setTxs(await res.json());
  }, []);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    Promise.resolve().then(() => fetchTxs());
  }, [user, fetchTxs]);

  async function approveTx(txId: string) {
    setApproveBusyId(txId);
    const res = await fetch(`/api/admin/transactions/${txId}/approve`, { method: "POST" });
    if (res.ok) await fetchTxs();
    setApproveBusyId(null);
  }

  async function rejectTx(txId: string) {
    if (!confirm("¿Rechazar esta transacción? Si es un retiro, se le devuelve el saldo al usuario.")) return;
    setRejectBusyId(txId);
    const res = await fetch(`/api/admin/transactions/${txId}/reject`, { method: "POST" });
    if (res.ok) await fetchTxs();
    setRejectBusyId(null);
  }

  const rows = useMemo(() => txs.map((t) => {
    const meta = parseMeta(t.meta);
    const isPendingTransfer = t.status === "PENDING" && meta.paymentMethod === "bank_transfer";
    const isPendingWithdrawal = t.status === "PENDING" && t.type === "WITHDRAWAL";
    return { t, meta, needsReview: isPendingTransfer || isPendingWithdrawal, isPendingTransfer, isPendingWithdrawal };
  }), [txs]);

  const visible = filter === "review" ? rows.filter((r) => r.needsReview) : rows;

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Transacciones"
        subtitle="Ledger completo de movimientos: compras, retiros, comisiones y transferencias."
        actions={
          <a href="/api/admin/transactions/export" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-rose-500 border border-slate-200 rounded-md px-3 py-1.5">
            <Download size={13} /> Exportar
          </a>
        }
      />

      <Toolbar>
        <FilterSelect value={filter} onChange={(e) => setFilter(e.target.value as "" | "review")}>
          <option value="">Todas</option>
          <option value="review">Por aprobar</option>
        </FilterSelect>
      </Toolbar>

      {visible.length === 0 ? (
        <Panel><EmptyState title="Sin transacciones" text={filter === "review" ? "No hay nada pendiente de aprobación." : "Todavía no hay transacciones."} /></Panel>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Tipo</Th>
              <Th>Usuario</Th>
              <Th>Monto</Th>
              <Th>Estado</Th>
              <Th>Fecha</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ t, meta, needsReview, isPendingTransfer, isPendingWithdrawal }) => (
              <tr key={t.id} className="hover:bg-slate-50 transition">
                <Td>
                  <p className="font-medium text-slate-700">{t.type}</p>
                  {isPendingTransfer && meta.receiptUrl && (
                    <a href={meta.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-rose-500 hover:underline">Ver comprobante</a>
                  )}
                  {isPendingWithdrawal && meta.payoutDestination && (
                    <p className="text-[11px] text-sky-600">Enviar a: <span className="select-all font-semibold">{meta.payoutDestination}</span></p>
                  )}
                </Td>
                <Td><span className="text-slate-500 truncate block max-w-[200px]">{t.user.name} ({t.user.email})</span></Td>
                <Td className="font-semibold text-slate-700 tabular-nums">${t.amount.toFixed(2)}</Td>
                <Td>
                  {isPendingTransfer && <Badge tone="amber">Transferencia pendiente</Badge>}
                  {isPendingWithdrawal && <Badge tone="blue">Retiro pendiente</Badge>}
                  {!needsReview && (t.status === "COMPLETED" ? <Badge tone="emerald">Completada</Badge> : <Badge>{t.status}</Badge>)}
                </Td>
                <Td className="text-slate-400">{new Date(t.createdAt).toLocaleDateString("es-AR")}</Td>
                <Td className="text-right">
                  {needsReview && (
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => approveTx(t.id)} disabled={approveBusyId === t.id || rejectBusyId === t.id}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50">
                        {approveBusyId === t.id ? "..." : "Aprobar"}
                      </button>
                      <button onClick={() => rejectTx(t.id)} disabled={approveBusyId === t.id || rejectBusyId === t.id}
                        className="text-xs font-semibold text-slate-400 hover:text-rose-600 disabled:opacity-50">
                        {rejectBusyId === t.id ? "..." : "Rechazar"}
                      </button>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
