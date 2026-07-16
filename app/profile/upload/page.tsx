"use client";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, ImagePlus, CheckCircle, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { BRANDS, CATEGORIES, CONDITIONS, sizesForCategory } from "@/lib/catalog";

export default function UploadPage() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({ title: "", description: "", size: "", brand: "", condition: "Bueno", category: "Ropa", price: "" });
  const [customBrand, setCustomBrand] = useState("");
  const [customSize, setCustomSize] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!imageFile || !user) return;
    setLoading(true);

    const fd = new FormData();
    fd.append("file", imageFile);
    const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
    const { url } = await uploadRes.json();

    const brand = form.brand === "Otra" ? customBrand.trim() : form.brand;
    const size = form.size === "Otro" ? customSize.trim() : form.size;

    const res = await fetch("/api/clothes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, brand, size, imageUrl: url }),
    });

    if (res.ok) {
      await refresh();
      setSuccess(true);
      setTimeout(() => router.push("/profile"), 2000);
    }
    setLoading(false);
  }

  if (success) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
        <CheckCircle size={64} className="text-emerald-500" />
      </motion.div>
      <h2 className="text-xl font-bold text-slate-800">¡Prenda publicada!</h2>
      <div className="flex items-center gap-2 bg-amber-50 text-amber-700 rounded-full px-4 py-2 text-sm font-semibold">
        <Zap size={16} /> +2 créditos ganados
      </div>
      <p className="text-sm text-slate-400">Redirigiendo al perfil...</p>
    </div>
  );

  return (
    <div className="max-w-sm mx-auto px-4 pt-6 pb-6">
      <h1 className="text-xl font-bold text-slate-800 mb-1">Publicar prenda</h1>
      <p className="text-xs text-slate-400 mb-5 flex items-center gap-1">
        <Zap size={12} className="text-amber-500" /> Ganá +2 créditos al publicar
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`relative h-48 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition ${dragging ? "border-rose-400 bg-rose-50" : "border-slate-200 bg-slate-50 hover:bg-rose-50 hover:border-rose-300"}`}
        >
          <AnimatePresence>
            {preview ? (
              <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 rounded-2xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="preview" className="w-full h-full object-cover" />
                <button type="button" onClick={(e) => { e.stopPropagation(); setPreview(null); setImageFile(null); }}
                  className="absolute top-2 right-2 bg-white rounded-full p-1 shadow text-slate-500 hover:text-rose-500">
                  <X size={14} />
                </button>
              </motion.div>
            ) : (
              <motion.div key="empty" className="flex flex-col items-center gap-2 text-slate-400">
                <ImagePlus size={32} strokeWidth={1.5} />
                <span className="text-sm font-medium">Arrastrá o hacé clic</span>
                <span className="text-xs">JPG, PNG, WEBP</span>
              </motion.div>
            )}
          </AnimatePresence>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>

        <input placeholder="Título (ej: Campera de cuero negra)" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          className="border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" required />
        <textarea placeholder="Descripción (opcional)" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          className="border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none h-20" />

        <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value, size: "" }))}
          className="border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white">
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>

        <div className="grid grid-cols-2 gap-3">
          <select value={form.size} onChange={(e) => setForm((p) => ({ ...p, size: e.target.value }))} required
            className="border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white">
            <option value="" disabled>Talle</option>
            {sizesForCategory(form.category).map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={form.brand} onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))} required
            className="border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white">
            <option value="" disabled>Marca</option>
            {BRANDS.map((b) => <option key={b}>{b}</option>)}
          </select>
        </div>

        {form.size === "Otro" && (
          <input placeholder="Especificá el talle" value={customSize} onChange={(e) => setCustomSize(e.target.value)}
            className="border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" required />
        )}
        {form.brand === "Otra" && (
          <input placeholder="Especificá la marca" value={customBrand} onChange={(e) => setCustomBrand(e.target.value)}
            className="border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" required />
        )}

        <select value={form.condition} onChange={(e) => setForm((p) => ({ ...p, condition: e.target.value }))}
          className="border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white">
          {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
        </select>

        <div className="relative">
          <span className="absolute left-4 top-3.5 text-slate-400 text-sm">$</span>
          <input type="number" placeholder="Precio (opcional, dejá vacío para canje)" value={form.price}
            onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
            className="w-full border border-slate-200 rounded-xl pl-7 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" min="0" step="0.01" />
        </div>

        <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={loading || !imageFile}
          className="w-full bg-rose-500 text-white font-semibold py-3.5 rounded-xl hover:bg-rose-600 transition flex items-center justify-center gap-2 disabled:opacity-50">
          <Upload size={18} /> {loading ? "Publicando..." : "Publicar prenda"}
        </motion.button>
      </form>
    </div>
  );
}
