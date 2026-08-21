"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, User as UserIcon, Package } from "lucide-react";

interface SearchUser { id: string; name: string; email: string; avatar: string }
interface SearchItem { id: string; title: string; imageUrl: string; user: { name: string } }

export function AdminSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [items, setItems] = useState<SearchItem[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      const t = setTimeout(() => Promise.resolve().then(() => { setUsers([]); setItems([]); }), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      fetch(`/api/admin/search?q=${encodeURIComponent(q.trim())}`)
        .then((r) => r.json())
        .then((d) => { setUsers(d.users ?? []); setItems(d.items ?? []); });
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const hasResults = users.length > 0 || items.length > 0;

  function go(href: string) {
    setOpen(false);
    setQ("");
    router.push(href);
  }

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 border border-slate-200 rounded-md px-3 py-1.5 bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-rose-200 transition">
        <Search size={14} className="text-slate-400 flex-shrink-0" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar usuarios, prendas..."
          className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-slate-400"
        />
      </div>
      {open && q.trim().length >= 2 && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg z-30 py-1 max-h-80 overflow-y-auto">
          {!hasResults && <p className="text-xs text-slate-400 px-3 py-3 text-center">Sin resultados para &ldquo;{q}&rdquo;.</p>}
          {users.length > 0 && (
            <div className="mb-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-3 pt-1.5 pb-1">Usuarios</p>
              {users.map((u) => (
                <button key={u.id} onClick={() => go(`/admin/users/${u.id}`)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50 transition">
                  <UserIcon size={13} className="text-slate-400 flex-shrink-0" />
                  <span className="text-xs text-slate-700 truncate">{u.name}</span>
                  <span className="text-[11px] text-slate-400 truncate">{u.email}</span>
                </button>
              ))}
            </div>
          )}
          {items.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-3 pt-1.5 pb-1">Publicaciones</p>
              {items.map((i) => (
                <button key={i.id} onClick={() => go(`/admin/publicaciones?q=${encodeURIComponent(i.title)}`)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50 transition">
                  <Package size={13} className="text-slate-400 flex-shrink-0" />
                  <span className="text-xs text-slate-700 truncate">{i.title}</span>
                  <span className="text-[11px] text-slate-400 truncate">{i.user.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
