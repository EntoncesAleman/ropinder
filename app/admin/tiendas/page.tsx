"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, Toolbar, SearchInput, TableWrap, Th, Td, Badge, EmptyState, Panel } from "@/components/admin/ui";

interface AdminStore {
  id: string; name: string; fullName: string; email: string; role: string;
  bannedAt: string | null; isPremium: boolean; verified: boolean;
  credits: number; balance: number; ratingAvg: number; ratingCount: number; createdAt: string;
  _count: { clothingItems: number; transactions: number };
}

// Same list as /admin/usuarios but filtered to accountType=STORE — kept as
// its own page (not a tab) because stores have their own pricing (see
// /admin/precios) and are a different kind of seller, not just a filter.
export default function TiendasPage() {
  const { user } = useAuth();
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [q, setQ] = useState("");

  const fetchStores = useCallback(async (query: string) => {
    const res = await fetch(`/api/admin/users?accountType=STORE${query ? `&q=${encodeURIComponent(query)}` : ""}`);
    if (res.ok) setStores(await res.json());
  }, []);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    Promise.resolve().then(() => fetchStores(""));
  }, [user, fetchStores]);

  async function makePersonal(email: string) {
    if (!confirm(`¿Volver a ${email} a cuenta personal? Pasa a la sección Usuarios y a los precios estándar.`)) return;
    const res = await fetch("/api/admin/set-account-type", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, accountType: "PERSONAL" }),
    });
    if (res.ok) await fetchStores(q);
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader title="Tiendas" subtitle="Cuentas comerciales — precios de créditos e insignia distintos a los de usuarios personales." />

      <Toolbar>
        <SearchInput value={q} onChange={(e) => { setQ(e.target.value); fetchStores(e.target.value); }} placeholder="Buscar tienda por nombre o email..." />
      </Toolbar>

      {stores.length === 0 ? (
        <Panel><EmptyState title="Sin tiendas" text="Todavía no hay ninguna cuenta convertida a Tienda. Se hace desde el botón en cada fila de Usuarios." /></Panel>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Tienda</Th>
              <Th>Estado</Th>
              <Th>Publicaciones</Th>
              <Th>Operaciones</Th>
              <Th>Reputación</Th>
              <Th>Registro</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {stores.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50 transition">
                <Td>
                  <Link href={`/admin/users/${s.id}`} className="block min-w-0">
                    <p className="font-medium text-slate-700 flex items-center gap-1.5 truncate max-w-[240px]">
                      {s.name}
                      {s.isPremium && <Badge tone="amber">Premium</Badge>}
                      {s.verified && <Badge tone="blue">Verificada</Badge>}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate max-w-[240px]">{s.email}</p>
                  </Link>
                </Td>
                <Td>{s.bannedAt ? <Badge tone="rose">Suspendida</Badge> : <Badge tone="emerald">Activa</Badge>}</Td>
                <Td className="text-slate-600 tabular-nums">{s._count.clothingItems}</Td>
                <Td className="text-slate-600 tabular-nums">{s._count.transactions}</Td>
                <Td className="text-slate-500">{s.ratingCount > 0 ? `★ ${s.ratingAvg.toFixed(1)} (${s.ratingCount})` : "—"}</Td>
                <Td className="text-slate-400">{new Date(s.createdAt).toLocaleDateString("es-AR")}</Td>
                <Td className="text-right">
                  <button onClick={() => makePersonal(s.email)} title="Volver a cuenta personal"
                    className="text-xs font-semibold text-slate-400 hover:text-rose-600 inline-flex items-center gap-1">
                    <User size={12} />
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
