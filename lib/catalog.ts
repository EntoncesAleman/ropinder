export const CATEGORIES = ["Ropa", "Calzado", "Accesorios", "Deportivo", "Formal"] as const;

export const CONDITIONS = ["Nuevo", "Muy bueno", "Bueno", "Regular"] as const;

export const BRANDS = [
  "Nike", "Adidas", "Puma", "Zara", "H&M", "Levi's", "Under Armour",
  "Tommy Hilfiger", "Uniqlo", "Forever 21", "Bershka", "Pull&Bear",
  "Vans", "Converse", "New Balance", "Otra",
] as const;

export const SIZES_CLOTHING = ["XS", "S", "M", "L", "XL", "XXL", "Otro"] as const;
export const SIZES_SHOES = ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "Otro"] as const;

export function sizesForCategory(category: string): readonly string[] {
  return category === "Calzado" ? SIZES_SHOES : SIZES_CLOTHING;
}
