import { SupplierHotel, HotelOffer } from './types';
import { normalizeHotelName } from './normalize';

/**
 * Converts a supplier hotel to a hotel offer with supplier tag.
 */
function toHotelOffer(hotel: SupplierHotel, supplier: 'A' | 'B'): HotelOffer {
  return {
    hotelId: hotel.hotelId,
    name: hotel.name,
    price: hotel.price,
    city: hotel.city,
    commissionPct: hotel.commissionPct,
    supplier,
  };
}

/**
 * Deduplicates hotels from two suppliers, selecting the best offer.
 *
 * Rules:
 * - Hotels are matched by normalized name (trim + lowercase)
 * - Supplier A is processed first
 * - Supplier B replaces A if:
 *   1. Price is STRICTLY lower, OR
 *   2. Price is EQUAL and commission is HIGHER (more revenue)
 * - Result is sorted by price (ascending)
 *
 * @param hotelsA - Hotels from Supplier A
 * @param hotelsB - Hotels from Supplier B
 * @returns Deduplicated array of best offers, sorted by price
 */
export function selectBestOffers(
  hotelsA: SupplierHotel[],
  hotelsB: SupplierHotel[]
): HotelOffer[] {
  const bestByName = new Map<string, HotelOffer>();

  // Process Supplier A first - all go into the map
  for (const hotel of hotelsA) {
    const key = normalizeHotelName(hotel.name);
    bestByName.set(key, toHotelOffer(hotel, 'A'));
  }

  // Process Supplier B
  for (const hotel of hotelsB) {
    const key = normalizeHotelName(hotel.name);
    const existing = bestByName.get(key);

    if (!existing) {
      // Hotel only exists in Supplier B
      bestByName.set(key, toHotelOffer(hotel, 'B'));
    } else if (hotel.price < existing.price) {
      // B is strictly cheaper - replace
      bestByName.set(key, toHotelOffer(hotel, 'B'));
    } else if (hotel.price === existing.price && hotel.commissionPct > existing.commissionPct) {
      // Same price but B has higher commission - replace (more revenue)
      bestByName.set(key, toHotelOffer(hotel, 'B'));
    }
    // If more expensive, or same price with lower/equal commission, keep existing
  }

  // Convert to array and sort by price ascending
  return Array.from(bestByName.values()).sort((a, b) => a.price - b.price);
}
