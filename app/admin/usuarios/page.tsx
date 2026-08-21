"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Download, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, Toolbar, SearchInput, TableWrap, Th, Td, Badge, EmptyState, Panel } from "@/components/admin/ui";

interface AdminUser {
  id: string; name: string; fullName: string; email: string; phone: string; role: string;
  bannedAt: string | null; isPremium: boolean; premiumUntil: string | null; verified: boolean;
  credits: number; balance: number; ratingAvg: number; ratingCount: number; createdAt: string;
  _count: { clothingItems: number; transactions: number };
}

export default function UsuariosPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);

  const fetchUsers = useCallback(async (query: string) => {
    const res = await fetch(`/api/admin/users${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    if (res.ok) setUsers(await res.json());
  }, []);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    Promise.resolve().then(() => fetchUsers(""));
  }, [user, fetchUsers]);

  async function toggleBan(userId: string, banned: boolean) {
    setBusyId(userId);
    const res = await fetch(`/api/admin/users/${userId}/ban`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ banned }),
    });
    if (res.ok) await fetchUsers(q);
    setBusyId(null);
  }

  async function deleteUser(userId: string) {
    if (!confirm("¿Borrar esta cuenta para siempre, junto con todo lo que publicó? No se puede deshacer.")) return;
    setDeleteBusyId(userId);
    const res = await fetch(`/api/admin/users/${userId}/delete`, { method: "POST" });
    if (res.ok) await fetchUsers(q);
    setDeleteBusyId(null);
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Usuarios"
        subtitle="Gestioná los usuarios de Ropinder."
        actions={
          <Link href="/api/admin/users/export" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-rose-500 border border-slate-200 rounded-md px-3 py-1.5">
            <Download size={13} /> Exportar
          </Link>
        }
      />

      <Toolbar>
        <SearchInput value={q} onChange={(e) => { setQ(e.target.value); fetchUsers(e.target.value); }} placeholder="Buscar por nombre o email..." />
      </Toolbar>

      {users.length === 0 ? (
        <Panel><EmptyState title="Sin resultados" text="Ningún usuario coincide con esta búsqueda." /></Panel>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Usuario</Th>
              <Th>Estado</Th>
              <Th>Publicaciones</Th>
              <Th>Operaciones</Th>
              <Th>Reputación</Th>
              <Th>Registro</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 transition">
                <Td>
                  <Link href={`/admin/users/${u.id}`} className="block min-w-0">
                    <p className="font-medium text-slate-700 flex items-center gap-1.5 truncate max-w-[240px]">
                      {u.name}
                      {u.role === "ADMIN" && <Badge tone="slate">ADMIN</Badge>}
                      {u.isPremium && <Badge tone="amber">Premium</Badge>}
                      {u.verified && <Badge tone="blue">Verificado</Badge>}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate max-w-[240px]">{u.email}</p>
                  </Link>
                </Td>
                <Td>{u.bannedAt ? <Badge tone="rose">Suspendido</Badge> : <Badge tone="emerald">Activo</Badge>}</Td>
                <Td className="text-slate-600 tabular-nums">{u._count.clothingItems}</Td>
                <Td className="text-slate-600 tabular-nums">{u._count.transactions}</Td>
                <Td className="text-slate-500">{u.ratingCount > 0 ? `★ ${u.ratingAvg.toFixed(1)} (${u.ratingCount})` : "—"}</Td>
                <Td className="text-slate-400">{new Date(u.createdAt).toLocaleDateString("es-AR")}</Td>
                <Td>
                  <div className="flex items-center justify-end gap-2 flex-shrink-0">
                    <button onClick={() => toggleBan(u.id, !u.bannedAt)} disabled={busyId === u.id}
                      className="text-xs font-semibold text-slate-500 hover:text-rose-600 disabled:opacity-50">
                      {u.bannedAt ? "Reactivar" : "Suspender"}
                    </button>
                    {u.role !== "ADMIN" && (
                      <button onClick={() => deleteUser(u.id)} disabled={deleteBusyId === u.id}
                        className="text-xs font-semibold text-slate-400 hover:text-rose-600 disabled:opacity-50 flex items-center gap-1">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
