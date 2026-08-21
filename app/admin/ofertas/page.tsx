"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, TableWrap, Th, Td, Badge, EmptyState, Panel } from "@/components/admin/ui";

interface AdminOffer {
  id: string; amount: number; status: string; offeredItemId: string | null; createdAt: string;
  item: { id: string; title: string };
  offeredItem: { id: string; title: string } | null;
  buyer: { id: string; name: string; email: string };
  seller: { id: string; name: string; email: string };
}

const STATUS_LABEL: Record<string, string> = { PENDING: "Pendiente", ACCEPTED: "Aceptada", REJECTED: "Rechazada", CANCELLED: "Cancelada" };
const STATUS_TONE: Record<string, "amber" | "emerald" | "rose" | "slate"> = { PENDING: "amber", ACCEPTED: "emerald", REJECTED: "rose", CANCELLED: "slate" };

export default function OfertasPage() {
  const { user } = useAuth();
  const [offers, setOffers] = useState<AdminOffer[]>([]);

  const fetchOffers = useCallback(async () => {
    const res = await fetch("/api/admin/offers");
    if (res.ok) setOffers(await res.json());
  }, []);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    Promise.resolve().then(() => fetchOffers());
  }, [user, fetchOffers]);

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader title="Ofertas" subtitle="Intercambios y ofertas en dinero entre usuarios (solo lectura)." />

      {offers.length === 0 ? (
        <Panel><EmptyState title="Sin ofertas" text="Todavía no se hizo ninguna oferta de intercambio o dinero." /></Panel>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Operación</Th>
              <Th>Tipo</Th>
              <Th>De</Th>
              <Th>Para</Th>
              <Th>Valor</Th>
              <Th>Estado</Th>
              <Th>Fecha</Th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => {
              const isTrade = !!o.offeredItemId;
              return (
                <tr key={o.id} className="hover:bg-slate-50 transition">
                  <Td>
                    <span className="text-slate-700 truncate block max-w-[280px]">
                      {isTrade ? `"${o.offeredItem?.title}" por "${o.item.title}"` : `Oferta por "${o.item.title}"`}
                    </span>
                  </Td>
                  <Td><Badge>{isTrade ? "Intercambio" : "Dinero"}</Badge></Td>
                  <Td><span className="text-slate-500 truncate block max-w-[160px]">{o.buyer.name}</span></Td>
                  <Td><span className="text-slate-500 truncate block max-w-[160px]">{o.seller.name}</span></Td>
                  <Td className="font-semibold text-slate-700">{isTrade ? "Trueque" : `$${o.amount}`}</Td>
                  <Td><Badge tone={STATUS_TONE[o.status] ?? "slate"}>{STATUS_LABEL[o.status] ?? o.status}</Badge></Td>
                  <Td className="text-slate-400">{new Date(o.createdAt).toLocaleDateString("es-AR")}</Td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
