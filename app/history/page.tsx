"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Receipt } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

interface Tx { id: string; amount: number; type: string; status: string; createdAt: string }

const TYPE_LABEL: Record<string, string> = {
  ESCROW_HOLD: "Pago en custodia",
  ESCROW_RELEASE: "Venta cobrada",
  ESCROW_REFUND: "Reembolso recibido",
  CREDIT_PURCHASE: "Compra de créditos/Premium",
  WITHDRAWAL: "Retiro",
  VERIFICATION: "Verificación de cuenta",
  MANUAL_CREDIT_GRANT: "Créditos acreditados por soporte",
  PREMIUM_BUMP: "Prenda destacada (bump)",
};

export default function HistoryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [txs, setTxs] = useState<Tx[]>([]);

  const fetchTxs = useCallback(async () => {
    const res = await fetch("/api/profile/transactions");
    if (res.ok) setTxs(await res.json());
  }, []);

  useEffect(() => {
    if (!loading && !user) { router.push("/login"); return; }
    if (user) fetchTxs();
  }, [user, loading, router, fetchTxs]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Cargando...</div>;
  if (!user) return null;

  return (
    <div className="max-w-sm mx-auto px-4 pt-6 pb-10">
      <Link href="/profile" className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-sm mb-4">
        <ArrowLeft size={16} /> Volver
      </Link>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Receipt size={18} className="text-rose-500" /> Historial
        </h1>
        <a href="/api/profile/transactions/export" className="flex items-center gap-1 text-xs text-slate-500 hover:text-rose-500">
          <Download size={13} /> CSV
        </a>
      </div>

      {txs.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-16">Todavía no tenés movimientos.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {txs.map((t) => (
            <div key={t.id} className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm border border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-700">{TYPE_LABEL[t.type] ?? t.type}</p>
                <p className="text-[11px] text-slate-400">{new Date(t.createdAt).toLocaleString("es-AR")}</p>
              </div>
              <p className={`text-sm font-bold ${t.amount >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                {t.amount !== 0 ? `$${t.amount.toFixed(2)}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
