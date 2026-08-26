"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, Toolbar, SearchInput, FilterSelect, TableWrap, Th, Td, Badge, EmptyState, Panel, timeAgo } from "@/components/admin/ui";

interface AuditLog {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  meta: string;
  createdAt: string;
  admin: { id: string; name: string; email: string };
}

function parseMeta(meta: string): Record<string, unknown> {
  try { return JSON.parse(meta); } catch { return {}; }
}

// Actions that touch money/balances get a warmer badge so they stand out in
// a mixed feed — everything else (bans, blocklist, role changes) stays neutral.
const FINANCIAL_ACTIONS = new Set([
  "COMMISSION_CONFIG_UPDATED", "WITHDRAWAL_APPROVED", "WITHDRAWAL_REJECTED",
  "BANK_TRANSFER_APPROVED", "BANK_TRANSFER_REJECTED", "REPORT_REFUNDED",
  "PREMIUM_GRANTED", "CREDITS_GRANTED", "PROMO_CREDIT_ALL", "PROMO_RAFFLE_WIN",
]);

export default function LogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");

  const fetchLogs = useCallback(async () => {
    const res = await fetch("/api/admin/logs");
    if (res.ok) setLogs(await res.json());
  }, []);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    Promise.resolve().then(() => fetchLogs());
  }, [user, fetchLogs]);

  const actions = useMemo(() => Array.from(new Set(logs.map((l) => l.action))).sort(), [logs]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return logs.filter((l) => {
      if (action && l.action !== action) return false;
      if (!needle) return true;
      return (
        l.admin.email.toLowerCase().includes(needle) ||
        l.admin.name?.toLowerCase().includes(needle) ||
        l.action.toLowerCase().includes(needle) ||
        l.targetType.toLowerCase().includes(needle) ||
        (l.targetId ?? "").toLowerCase().includes(needle) ||
        l.meta.toLowerCase().includes(needle)
      );
    });
  }, [logs, q, action]);

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Registro de auditoría"
        subtitle="Últimas 300 acciones sensibles de administradores: bans, roles, comisiones, créditos y pagos."
      />

      <Toolbar>
        <SearchInput placeholder="Buscar por admin, acción, target…" value={q} onChange={(e) => setQ(e.target.value)} />
        <FilterSelect value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">Todas las acciones</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </FilterSelect>
      </Toolbar>

      {visible.length === 0 ? (
        <Panel><EmptyState title="Sin registros" text={q || action ? "Nada coincide con el filtro." : "Todavía no hay acciones registradas."} /></Panel>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Acción</Th>
              <Th>Admin</Th>
              <Th>Target</Th>
              <Th>Detalle</Th>
              <Th className="text-right">Fecha</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((l) => {
              const meta = parseMeta(l.meta);
              const metaEntries = Object.entries(meta).filter(([, v]) => v !== "" && v !== null && v !== undefined);
              return (
                <tr key={l.id} className="hover:bg-slate-50 transition">
                  <Td>
                    <Badge tone={FINANCIAL_ACTIONS.has(l.action) ? "amber" : "slate"}>{l.action}</Badge>
                  </Td>
                  <Td><span className="text-slate-500 truncate block max-w-[200px]">{l.admin.name} ({l.admin.email})</span></Td>
                  <Td>
                    <span className="text-slate-700">{l.targetType}</span>
                    {l.targetId && <span className="text-slate-400 text-[11px] block truncate max-w-[160px]">{l.targetId}</span>}
                  </Td>
                  <Td>
                    {metaEntries.length === 0 ? (
                      <span className="text-slate-300">—</span>
                    ) : (
                      <span className="text-[11px] text-slate-500">
                        {metaEntries.map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}
                      </span>
                    )}
                  </Td>
                  <Td className="text-right text-slate-400 whitespace-nowrap">{timeAgo(l.createdAt)}</Td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
