"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bookmark, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { CATEGORIES, STYLES, BRANDS, SIZES_CLOTHING } from "@/lib/catalog";

interface SavedSearchQuery {
  category?: string; brand?: string; size?: string; style?: string; priceMax?: number; q?: string;
}
interface SavedSearch {
  id: string; query: SavedSearchQuery; createdAt: string;
}

const selectCls = "border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-300";

function describe(q: SavedSearchQuery): string {
  const parts = [q.category, q.brand, q.style, q.size && `talle ${q.size}`, q.priceMax && `hasta $${q.priceMax}`, q.q && `"${q.q}"`].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Cualquier prenda";
}

export default function BusquedasGuardadasPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [style, setStyle] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const fetchSearches = useCallback(async () => {
    const res = await fetch("/api/saved-searches");
    if (res.ok) setSearches(await res.json());
  }, []);

  useEffect(() => {
    if (user) Promise.resolve().then(() => fetchSearches());
  }, [user, fetchSearches]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const res = await fetch("/api/saved-searches", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, brand, size, style, priceMax, q }),
    });
    const data = await res.json();
    if (res.ok) {
      setCategory(""); setBrand(""); setSize(""); setStyle(""); setPriceMax(""); setQ("");
      await fetchSearches();
    } else setErr(data.error ?? "Error");
    setBusy(false);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/saved-searches/${id}`, { method: "DELETE" });
    if (res.ok) await fetchSearches();
  }

  if (loading || !user) return null;

  return (
    <div className="max-w-sm mx-auto px-4 pt-6 pb-8">
      <div className="flex items-center gap-2 mb-5">
        <Link href="/profile" aria-label="Volver" className="p-1.5 -ml-1.5"><ArrowLeft size={20} className="text-slate-600" /></Link>
        <h1 className="text-lg font-bold text-slate-800">Búsquedas guardadas</h1>
      </div>
      <p className="text-xs text-slate-400 mb-4">Te avisamos apenas se publique algo que coincida con lo que elegiste acá.</p>

      <form onSubmit={handleCreate} className="flex flex-col gap-2.5 bg-white rounded-2xl p-4 border border-slate-100 mb-6">
        <div className="grid grid-cols-2 gap-2.5">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
            <option value="">Categoría</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={brand} onChange={(e) => setBrand(e.target.value)} className={selectCls}>
            <option value="">Marca</option>
            {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={size} onChange={(e) => setSize(e.target.value)} className={selectCls}>
            <option value="">Talle</option>
            {SIZES_CLOTHING.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={style} onChange={(e) => setStyle(e.target.value)} className={selectCls}>
            <option value="">Estilo</option>
            {STYLES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <input value={priceMax} onChange={(e) => setPriceMax(e.target.value)} type="number" min="1" placeholder="Precio máximo (opcional)" className={selectCls} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Palabra clave (opcional)" className={selectCls} />
        {err && <p className="text-xs text-rose-500">{err}</p>}
        <button type="submit" disabled={busy} className="bg-rose-500 text-white font-semibold text-sm py-2.5 rounded-xl hover:bg-rose-600 transition disabled:opacity-60">
          {busy ? "Guardando..." : "Guardar búsqueda"}
        </button>
      </form>

      {searches.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">Todavía no guardaste ninguna búsqueda.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {searches.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 bg-white rounded-xl border border-slate-100 px-3.5 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <Bookmark size={14} className="text-rose-400 flex-shrink-0" />
                <p className="text-sm text-slate-700 truncate">{describe(s.query)}</p>
              </div>
              <button onClick={() => handleDelete(s.id)} aria-label="Eliminar búsqueda guardada" className="text-slate-400 hover:text-rose-500 flex-shrink-0">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
