"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Download, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, Toolbar, SearchInput, FilterSelect, TableWrap, Th, Td, Badge, EmptyState, Panel } from "@/components/admin/ui";

interface AdminItem {
  id: string; title: string; imageUrl: string; price: number | null; listingType: string;
  archived: boolean; createdAt: string;
  user: { id: string; name: string; email: string };
  _count: { reports: number };
}

const LISTING_LABEL: Record<string, string> = { VENTA: "Venta", INTERCAMBIO: "Intercambio", SUBASTA: "Subasta" };

function PublicacionesContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<AdminItem[]>([]);
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [listingType, setListingType] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const fetchItems = useCallback(async (query: string, lt: string, st: string) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (lt) params.set("listingType", lt);
    if (st) params.set("status", st);
    const res = await fetch(`/api/admin/items?${params.toString()}`);
    if (res.ok) setItems(await res.json());
  }, []);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    Promise.resolve().then(() => fetchItems(q, listingType, status));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function toggleVisibility(itemId: string) {
    setBusyId(itemId);
    const res = await fetch(`/api/admin/items/${itemId}/toggle-visibility`, { method: "POST" });
    if (res.ok) await fetchItems(q, listingType, status);
    setBusyId(null);
  }

  async function bulkHide() {
    if (selected.size === 0) return;
    if (!confirm(`¿Ocultar ${selected.size} publicación(es) seleccionada(s)?`)) return;
    setBulkBusy(true);
    await Promise.all(
      items.filter((i) => selected.has(i.id) && !i.archived)
        .map((i) => fetch(`/api/admin/items/${i.id}/toggle-visibility`, { method: "POST" }))
    );
    setSelected(new Set());
    await fetchItems(q, listingType, status);
    setBulkBusy(false);
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === items.length ? new Set() : new Set(items.map((i) => i.id))));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Publicaciones"
        subtitle="Gestioná todas las prendas publicadas en Ropinder."
        actions={
          <a href="/api/admin/items/export" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-rose-500 border border-slate-200 rounded-md px-3 py-1.5">
            <Download size={13} /> Exportar
          </a>
        }
      />

      <Toolbar>
        <SearchInput value={q} onChange={(e) => { setQ(e.target.value); fetchItems(e.target.value, listingType, status); }} placeholder="Buscar por título, marca o vendedor..." />
        <FilterSelect value={listingType} onChange={(e) => { setListingType(e.target.value); fetchItems(q, e.target.value, status); }}>
          <option value="">Todas las modalidades</option>
          <option value="VENTA">Venta</option>
          <option value="INTERCAMBIO">Intercambio</option>
          <option value="SUBASTA">Subasta</option>
        </FilterSelect>
        <FilterSelect value={status} onChange={(e) => { setStatus(e.target.value); fetchItems(q, listingType, e.target.value); }}>
          <option value="">Todos los estados</option>
          <option value="active">Activas</option>
          <option value="archived">Ocultas/vendidas</option>
        </FilterSelect>
        {selected.size > 0 && (
          <button onClick={bulkHide} disabled={bulkBusy}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-slate-700 rounded-md px-3 py-1.5 disabled:opacity-50">
            <EyeOff size={13} /> Ocultar {selected.size} seleccionada{selected.size > 1 ? "s" : ""}
          </button>
        )}
      </Toolbar>

      {items.length === 0 ? (
        <Panel><EmptyState title="Sin publicaciones" text="No hay publicaciones que coincidan con estos filtros." /></Panel>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th className="w-8"><input type="checkbox" checked={selected.size === items.length} onChange={toggleAll} className="accent-rose-500" /></Th>
              <Th>Prenda</Th>
              <Th>Vendedor</Th>
              <Th>Modalidad</Th>
              <Th>Precio</Th>
              <Th>Estado</Th>
              <Th>Fecha</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition">
                <Td><input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleOne(item.id)} className="accent-rose-500" /></Td>
                <Td>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative w-9 h-9 rounded-md overflow-hidden flex-shrink-0 bg-slate-100">
                      <Image src={item.imageUrl} alt={item.title} fill sizes="36px" className="object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-700 truncate max-w-[220px]">{item.title}</p>
                      {item._count.reports > 0 && <Badge tone="rose">{item._count.reports} reporte{item._count.reports > 1 ? "s" : ""}</Badge>}
                    </div>
                  </div>
                </Td>
                <Td><span className="text-slate-500 truncate block max-w-[160px]">{item.user.name}</span></Td>
                <Td><Badge>{LISTING_LABEL[item.listingType] ?? item.listingType}</Badge></Td>
                <Td className="font-semibold text-slate-700">{item.price != null ? `$${item.price}` : "—"}</Td>
                <Td>{item.archived ? <Badge tone="slate">Oculta/vendida</Badge> : <Badge tone="emerald">Activa</Badge>}</Td>
                <Td className="text-slate-400">{new Date(item.createdAt).toLocaleDateString("es-AR")}</Td>
                <Td className="text-right">
                  <button onClick={() => toggleVisibility(item.id)} disabled={busyId === item.id}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-rose-600 disabled:opacity-50">
                    {item.archived ? <Eye size={13} /> : <EyeOff size={13} />}
                    {busyId === item.id ? "..." : item.archived ? "Restaurar" : "Ocultar"}
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}

export default function PublicacionesPage() {
  return (
    <Suspense fallback={null}>
      <PublicacionesContent />
    </Suspense>
  );
}
