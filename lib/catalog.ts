export const CATEGORIES = ["Ropa", "Calzado", "Accesorios", "Deportivo", "Formal"] as const;

export const CONDITIONS = ["Nuevo", "Muy bueno", "Bueno", "Regular"] as const;

// Style tags — picked by buyers during onboarding (affinity, never a hard
// filter) and optionally tagged by sellers when publishing a listing.
export const STYLES = [
  { id: "urbano", label: "Urbano", emoji: "🧢", gradient: "from-slate-600 to-slate-800" },
  { id: "deportivo", label: "Deportivo", emoji: "🏃", gradient: "from-sky-500 to-blue-700" },
  { id: "formal", label: "Formal", emoji: "🧥", gradient: "from-zinc-700 to-zinc-900" },
  { id: "vintage", label: "Vintage", emoji: "📻", gradient: "from-amber-600 to-orange-800" },
  { id: "rocker", label: "Rocker", emoji: "🎸", gradient: "from-neutral-800 to-black" },
  { id: "romantico", label: "Romántico", emoji: "🌸", gradient: "from-pink-400 to-rose-500" },
  { id: "casual", label: "Casual", emoji: "👖", gradient: "from-cyan-500 to-teal-600" },
  { id: "boho", label: "Boho", emoji: "🌿", gradient: "from-lime-600 to-emerald-700" },
  { id: "y2k", label: "Y2K", emoji: "💿", gradient: "from-fuchsia-500 to-purple-700" },
  { id: "lujo", label: "Marca de lujo", emoji: "💎", gradient: "from-yellow-500 to-amber-700" },
] as const;

export type StyleId = (typeof STYLES)[number]["id"];

export const BRANDS = [
  "Nike", "Adidas", "Puma", "Zara", "H&M", "Levi's", "Under Armour",
  "Tommy Hilfiger", "Uniqlo", "Forever 21", "Bershka", "Pull&Bear",
  "Vans", "Converse", "New Balance", "Otra",
] as const;

// Wider pool for the "marcas que te interesen" onboarding picker — not tied
// to the fixed BRANDS select above, this one supports free-text search.
export const POPULAR_BRANDS = [
  "Adidas", "Adidas Originals", "Zara", "Bershka", "Ay Not Dead", "Kosiuko",
  "Calvin Klein", "Jazmín Chebar", "Akiabara", "CHER.", "Zadig & Voltaire",
  "Abercrombie & Fitch", "AllSaints", "Awada", "Birkenstock", "JOHN L. COOK",
  "Maria Cher", "Nike", "Prüne", "Rapsodia", "Uma", "Portsaid", "Vitamina",
  "47 Street", "Complot", "Ossira", "Yagmour", "Etam", "Lacoste", "Levi's",
  "Puma", "Tommy Hilfiger", "H&M", "Uniqlo", "Pull&Bear", "Vans", "Converse",
] as const;

export const SIZES_CLOTHING = ["XS", "S", "M", "L", "XL", "XXL", "Otro"] as const;
export const SIZES_SHOES = ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "Otro"] as const;

export function sizesForCategory(category: string): readonly string[] {
  return category === "Calzado" ? SIZES_SHOES : SIZES_CLOTHING;
}
