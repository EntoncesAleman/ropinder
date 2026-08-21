"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, TableWrap, Th, Td, Badge, EmptyState, Panel } from "@/components/admin/ui";

interface AdminAuction {
  id: string; currentPrice: number; startingPrice: number; startsAt: string; endsAt: string; status: string; createdAt: string;
  item: { id: string; title: string; imageUrl: string };
  seller: { id: string; name: string; email: string };
  winner: { id: string; name: string; email: string } | null;
  _count: { bids: number };
}

const STATUS_LABEL: Record<string, string> = { SCHEDULED: "Programada", ACTIVE: "Activa", ENDED: "Finalizada", CANCELLED: "Cancelada" };
const STATUS_TONE: Record<string, "amber" | "emerald" | "slate" | "rose"> = { SCHEDULED: "amber", ACTIVE: "emerald", ENDED: "slate", CANCELLED: "rose" };

const FILTERS = [
  { id: "", label: "Todas" },
  { id: "ACTIVE", label: "Activas" },
  { id: "SCHEDULED", label: "Programadas" },
  { id: "ENDED", label: "Finalizadas" },
  { id: "CANCELLED", label: "Canceladas" },
] as const;

export default function SubastasPage() {
  const { user } = useAuth();
  const [auctions, setAuctions] = useState<AdminAuction[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchAuctions = useCallback(async () => {
    const res = await fetch("/api/admin/auctions");
    if (res.ok) setAuctions(await res.json());
  }, []);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    Promise.resolve().then(() => fetchAuctions());
  }, [user, fetchAuctions]);

  async function cancelAuction(auctionId: string) {
    if (!confirm("¿Cancelar esta subasta?")) return;
    setBusyId(auctionId);
    const res = await fetch(`/api/admin/auctions/${auctionId}/cancel`, { method: "POST" });
    if (res.ok) await fetchAuctions();
    setBusyId(null);
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of auctions) c[a.status] = (c[a.status] ?? 0) + 1;
    return c;
  }, [auctions]);

  const visible = filter ? auctions.filter((a) => a.status === filter) : auctions;

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader title="Subastas" subtitle="Todas las subastas de la plataforma." />

      <div className="flex items-center gap-1 border-b border-slate-200 mb-4">
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition ${filter === f.id ? "border-rose-500 text-rose-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {f.label} {f.id && counts[f.id] ? <span className="text-slate-400">({counts[f.id]})</span> : f.id === "" && auctions.length ? <span className="text-slate-400">({auctions.length})</span> : null}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Panel><EmptyState title="Sin subastas" text="No hay subastas que coincidan con este filtro." /></Panel>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Prenda</Th>
              <Th>Vendedor</Th>
              <Th>Precio inicial</Th>
              <Th>Puja actual</Th>
              <Th>Pujas</Th>
              <Th>Cierre</Th>
              <Th>Estado</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((a) => {
              const canCancel = a.status === "ACTIVE" || a.status === "SCHEDULED";
              return (
                <tr key={a.id} className="hover:bg-slate-50 transition">
                  <Td>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative w-9 h-9 rounded-md overflow-hidden flex-shrink-0 bg-slate-100">
                        <Image src={a.item.imageUrl} alt={a.item.title} fill sizes="36px" className="object-cover" />
                      </div>
                      <span className="font-medium text-slate-700 truncate max-w-[200px]">{a.item.title}</span>
                    </div>
                  </Td>
                  <Td><span className="text-slate-500 truncate block max-w-[160px]">{a.seller.name}</span></Td>
                  <Td className="text-slate-600 tabular-nums">${a.startingPrice}</Td>
                  <Td className="font-semibold text-slate-700 tabular-nums">${a.currentPrice}</Td>
                  <Td className="text-slate-500 tabular-nums">{a._count.bids}</Td>
                  <Td className="text-slate-400">{new Date(a.endsAt).toLocaleString("es-AR")}</Td>
                  <Td>
                    <Badge tone={STATUS_TONE[a.status] ?? "slate"}>{STATUS_LABEL[a.status] ?? a.status}</Badge>
                    {a.winner && <p className="text-[11px] text-slate-400 mt-0.5">Ganó: {a.winner.name}</p>}
                  </Td>
                  <Td className="text-right">
                    {canCancel && (
                      <button onClick={() => cancelAuction(a.id)} disabled={busyId === a.id}
                        className="text-xs font-semibold text-slate-500 hover:text-rose-600 disabled:opacity-50">
                        {busyId === a.id ? "..." : "Cancelar"}
                      </button>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
