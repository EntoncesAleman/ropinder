"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, ImagePlus, CheckCircle, Zap, Tag, Repeat, Gavel } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { BRANDS, CATEGORIES, CONDITIONS, STYLES, sizesForCategory } from "@/lib/catalog";

type Modality = "VENTA" | "INTERCAMBIO" | "SUBASTA";

const MODALITIES: { id: Modality; label: string; icon: typeof Tag; hint: string }[] = [
  { id: "VENTA", label: "Venta", icon: Tag, hint: "Precio fijo" },
  { id: "INTERCAMBIO", label: "Intercambio", icon: Repeat, hint: "Prenda por prenda" },
  { id: "SUBASTA", label: "Subasta", icon: Gavel, hint: "Al mejor postor" },
];

export default function UploadPage() {
  const router = useRouter();
  const { user, refresh } = useAuth();

  useEffect(() => {
    if (user?.role === "ADMIN") router.push("/admin");
  }, [user, router]);
  const [form, setForm] = useState({ title: "", description: "", size: "", brand: "", condition: "Bueno", category: "Ropa", style: "", price: "" });
  const [customBrand, setCustomBrand] = useState("");
  const [customSize, setCustomSize] = useState("");
  const [modality, setModality] = useState<Modality>("VENTA");
  const [auctionStartingPrice, setAuctionStartingPrice] = useState("");
  const [auctionMinIncrement, setAuctionMinIncrement] = useState("");
  const [auctionDurationHours, setAuctionDurationHours] = useState("24");
  const MAX_PHOTOS = 6;
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setImageFiles((prev) => [...prev, ...images].slice(0, MAX_PHOTOS));
    images.slice(0, Math.max(0, MAX_PHOTOS - imageFiles.length)).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => setPreviews((prev) => [...prev, reader.result as string].slice(0, MAX_PHOTOS));
      reader.readAsDataURL(file);
    });
  }, [imageFiles.length]);

  function removePhoto(index: number) {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (imageFiles.length === 0 || !user) return;

    if (modality === "VENTA" && !(Number(form.price) > 0)) {
      setError("Ingresá un precio para vender la prenda");
      return;
    }
    if (modality === "SUBASTA" && !(Number(auctionStartingPrice) > 0 && Number(auctionMinIncrement) > 0)) {
      setError("Completá el precio inicial y el incremento mínimo de la subasta");
      return;
    }

    setLoading(true);
    setError("");

    // Uploaded one at a time (not Promise.all) so a failure mid-batch stops
    // early instead of racing partial uploads against each other.
    const urls: string[] = [];
    for (const file of imageFiles) {
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
      const uploadData = await uploadRes.json().catch(() => ({ error: "Error de conexión al subir una imagen" }));
      if (!uploadRes.ok) {
        setError(uploadData.error ?? "No se pudo subir una de las imágenes");
        setLoading(false);
        return;
      }
      urls.push(uploadData.url);
    }

    const brand = form.brand === "Otra" ? customBrand.trim() : form.brand;
    const size = form.size === "Otro" ? customSize.trim() : form.size;

    const body: Record<string, unknown> = {
      ...form, brand, size, imageUrl: urls[0], images: urls,
      price: modality === "VENTA" ? form.price : "",
    };
    if (modality === "SUBASTA") {
      body.listingType = "SUBASTA";
      body.auction = {
        startingPrice: Number(auctionStartingPrice),
        minIncrement: Number(auctionMinIncrement),
        durationHours: Number(auctionDurationHours),
      };
    }

    const res = await fetch("/api/clothes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      await refresh();
      setSuccess(true);
      setTimeout(() => router.push("/ropero"), 2000);
    } else {
      const data = await res.json().catch(() => ({ error: "Error de conexión" }));
      setError(data.error ?? "No se pudo publicar la prenda");
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
        {previews.length === 0 ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`relative h-48 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition ${dragging ? "border-rose-400 bg-rose-50" : "border-slate-200 bg-slate-50 hover:bg-rose-50 hover:border-rose-300"}`}
          >
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <ImagePlus size={32} strokeWidth={1.5} />
              <span className="text-sm font-medium">Arrastrá o hacé clic</span>
              <span className="text-xs">Hasta {MAX_PHOTOS} fotos — JPG, PNG, WEBP</span>
            </div>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-3 gap-2">
              <AnimatePresence>
                {previews.map((src, i) => (
                  <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                    className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                    {i === 0 && <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-semibold rounded-full px-1.5 py-0.5">Portada</span>}
                    <button type="button" onClick={() => removePhoto(i)} aria-label={`Quitar foto ${i + 1}`}
                      className="absolute top-1 right-1 bg-white rounded-full p-1 shadow text-slate-500 hover:text-rose-500">
                      <X size={12} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {previews.length < MAX_PHOTOS && (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-rose-50 hover:border-rose-300 flex items-center justify-center text-slate-400 transition">
                  <ImagePlus size={22} strokeWidth={1.5} />
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">La primera foto es la portada — se ve en el feed y el swipe.</p>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ""; }} />

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

        <div>
          <p className="text-xs text-slate-400 mb-2">Estilo (opcional, ayuda a que la vea la gente correcta)</p>
          <div className="flex flex-wrap gap-2">
            {STYLES.map((s) => {
              const active = form.style === s.id;
              return (
                <button key={s.id} type="button"
                  onClick={() => setForm((p) => ({ ...p, style: active ? "" : s.id }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition flex items-center gap-1 ${active ? "bg-rose-500 text-white border-rose-500" : "bg-white text-slate-600 border-slate-200 hover:border-rose-300"}`}>
                  <span>{s.emoji}</span> {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-xs text-slate-400 mb-2">Modalidad</p>
          <div className="grid grid-cols-3 gap-2">
            {MODALITIES.map(({ id, label, icon: Icon, hint }) => {
              const active = modality === id;
              return (
                <button key={id} type="button" onClick={() => setModality(id)}
                  className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 transition ${active ? "bg-rose-500 text-white border-rose-500" : "bg-white text-slate-600 border-slate-200 hover:border-rose-300"}`}>
                  <Icon size={16} />
                  <span className="text-xs font-semibold">{label}</span>
                  <span className={`text-[10px] ${active ? "text-rose-100" : "text-slate-400"}`}>{hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        {modality === "VENTA" && (
          <div className="relative">
            <span className="absolute left-4 top-3.5 text-slate-400 text-sm">$</span>
            <input type="number" placeholder="Precio" value={form.price}
              onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl pl-7 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" min="0" step="0.01" required />
          </div>
        )}

        {modality === "INTERCAMBIO" && (
          <p className="text-xs text-slate-400 bg-slate-50 rounded-xl px-4 py-3">
            Sin precio: quien haga match va a poder proponerte cambiarla por una de sus prendas.
          </p>
        )}

        {modality === "SUBASTA" && (
          <div className="flex flex-col gap-3 bg-slate-50 rounded-xl p-4">
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-400 text-sm">$</span>
              <input type="number" placeholder="Precio inicial" value={auctionStartingPrice}
                onChange={(e) => setAuctionStartingPrice(e.target.value)}
                className="w-full border border-slate-200 rounded-xl pl-7 pr-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-300" min="0" step="0.01" required />
            </div>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-400 text-sm">$</span>
              <input type="number" placeholder="Incremento mínimo por puja" value={auctionMinIncrement}
                onChange={(e) => setAuctionMinIncrement(e.target.value)}
                className="w-full border border-slate-200 rounded-xl pl-7 pr-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-300" min="0" step="0.01" required />
            </div>
            <select value={auctionDurationHours} onChange={(e) => setAuctionDurationHours(e.target.value)}
              className="border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-300">
              <option value="6">Dura 6 horas</option>
              <option value="24">Dura 1 día</option>
              <option value="72">Dura 3 días</option>
              <option value="168">Dura 7 días</option>
            </select>
          </div>
        )}

        {error && <p className="text-rose-500 text-sm text-center">{error}</p>}

        <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={loading || imageFiles.length === 0}
          className="w-full bg-rose-500 text-white font-semibold py-3.5 rounded-xl hover:bg-rose-600 transition flex items-center justify-center gap-2 disabled:opacity-50">
          <Upload size={18} /> {loading ? "Publicando..." : "Publicar prenda"}
        </motion.button>
      </form>
    </div>
  );
}
