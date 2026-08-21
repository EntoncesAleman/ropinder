import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

// Shared visual language for the admin backoffice — deliberately tighter and
// more structured than the consumer app (see ADMIN_ARCHITECTURE.md §1):
// rounded-md instead of pill/rounded-2xl, borders instead of floating
// shadows, neutral surfaces with color reserved for state/action.

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 mb-4">{children}</div>;
}

export function SearchInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="flex-1 min-w-[180px] border border-slate-200 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
    />
  );
}

export function FilterSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="border border-slate-200 rounded-md px-2.5 py-1.5 text-sm bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-200"
    />
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white border border-slate-200 rounded-lg ${className}`}>{children}</div>;
}

export function StatCard({ label, value, tone }: { label: string; value: string | number; tone?: "rose" | "amber" | "emerald" }) {
  const dot: Record<string, string> = { rose: "bg-rose-500", amber: "bg-amber-500", emerald: "bg-emerald-500" };
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
      <div className="flex items-center gap-1.5 mb-1">
        {tone && <span className={`w-1.5 h-1.5 rounded-full ${dot[tone]}`} />}
        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-xl font-bold text-slate-900 tabular-nums">{value}</p>
    </div>
  );
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "rose" | "amber" | "emerald" | "blue" }) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-600",
    rose: "bg-rose-100 text-rose-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
  };
  return <span className={`inline-flex items-center text-[11px] font-semibold px-1.5 py-0.5 rounded ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({ icon: Icon = Inbox, title, text }: { icon?: typeof Inbox; title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-16 text-center">
      <Icon size={26} strokeWidth={1.5} className="text-slate-300 mb-1" />
      <p className="text-sm font-medium text-slate-500">{title}</p>
      {text && <p className="text-xs text-slate-400 max-w-[280px]">{text}</p>}
    </div>
  );
}

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">{children}</table>
      </div>
    </div>
  );
}

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <th className={`text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide px-3 py-2.5 border-b border-slate-200 bg-slate-50 ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 border-b border-slate-100 align-middle ${className}`}>{children}</td>;
}

export function ActionMenu({ children }: { children: ReactNode }) {
  return (
    <details className="relative inline-block">
      <summary className="list-none cursor-pointer w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition">
        ⋮
      </summary>
      <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-md shadow-lg py-1 z-20">
        {children}
      </div>
    </details>
  );
}

export function ActionMenuItem({ children, onClick, danger, disabled }: { children: ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={(e) => { (e.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open"); onClick(); }}
      disabled={disabled}
      className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50 ${danger ? "text-rose-600" : "text-slate-600"}`}
    >
      {children}
    </button>
  );
}

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr}h`;
  return `hace ${Math.floor(hr / 24)}d`;
}
