// Saved searches — a standing filter a user wants alerted about when a
// matching item is published (lib/notify.ts fires the alert, see
// notifyMatchingSavedSearches in app/api/clothes/route.ts). Pure matching
// logic lives here so it's unit-testable without a database.
export interface SavedSearchQuery {
  category?: string;
  brand?: string;
  size?: string;
  style?: string;
  priceMax?: number;
  q?: string;
}

export interface MatchableItem {
  title: string;
  category: string;
  brand: string;
  size: string;
  style: string;
  price: number | null;
}

// Every field the user set on the search must match; fields they left
// blank impose no constraint. An empty query object matches everything —
// callers should treat that as "too broad" rather than alert on it blindly.
export function matchesSavedSearch(query: SavedSearchQuery, item: MatchableItem): boolean {
  if (query.category && item.category.toLowerCase() !== query.category.toLowerCase()) return false;
  if (query.brand && item.brand.toLowerCase() !== query.brand.toLowerCase()) return false;
  if (query.size && item.size.toLowerCase() !== query.size.toLowerCase()) return false;
  if (query.style && item.style.toLowerCase() !== query.style.toLowerCase()) return false;
  if (query.priceMax != null && (item.price == null || item.price > query.priceMax)) return false;
  if (query.q && !item.title.toLowerCase().includes(query.q.toLowerCase())) return false;
  return true;
}

// A search with nothing set would alert on every single new listing —
// reject it at creation time rather than silently spamming later.
export function isSavedSearchQueryTooBroad(query: SavedSearchQuery): boolean {
  return !query.category && !query.brand && !query.size && !query.style && query.priceMax == null && !query.q;
}
