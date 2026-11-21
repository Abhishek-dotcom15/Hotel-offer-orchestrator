/**
 * Normalizes a hotel name for deduplication matching.
 * Trims whitespace and converts to lowercase.
 * Example: "  Holtin  " → "holtin"
 */
export function normalizeHotelName(name: string): string {
  return name.trim().toLowerCase();
}
