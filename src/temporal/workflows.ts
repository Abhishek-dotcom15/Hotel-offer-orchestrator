import { proxyActivities } from '@temporalio/workflow';
import type * as activities from './activities';
import { selectBestOffers } from '../domain/dedupe';
import { HotelOffer, SupplierHotel, HotelResponse, ResponseMeta } from '../domain/types';

// Create activity stubs with timeouts
// Note: We use separate proxy for fetch activities with fewer retries to fail faster
const { saveToRedis, queryRedis, checkCacheExists, getCacheTTL } = proxyActivities<typeof activities>({
  startToCloseTimeout: '30 seconds',
  retry: {
    maximumAttempts: 3,
  },
});

// Fetch activities with fewer retries to allow graceful degradation
const { fetchSupplierA, fetchSupplierB } = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 seconds',
  retry: {
    maximumAttempts: 2,
  },
});

// Default TTL for cache age calculation (should match config)
const DEFAULT_CACHE_TTL = 1800; // 30 minutes

/**
 * Hotel Offer Workflow - Resilient Version
 *
 * Orchestrates the full flow with graceful degradation:
 * 1. Check Redis cache first - if hit, return cached data
 * 2. Fetch from both suppliers in parallel (using Promise.allSettled)
 * 3. If one fails, return partial results from the other
 * 4. If both fail, fall back to stale cache if available
 * 5. If no data at all, throw error
 * 6. Return results with meta indicating data freshness
 */
export async function hotelOfferWorkflow(
  city: string,
  minPrice?: number,
  maxPrice?: number
): Promise<HotelResponse> {
  // Initialize meta
  const meta: ResponseMeta = {
    sources: {
      supplierA: 'skipped',
      supplierB: 'skipped',
    },
    fromCache: false,
    dataFreshness: 'live',
  };

  // 1. Check if cache exists for this city
  const cacheExists = await checkCacheExists(city);

  if (cacheExists) {
    // Cache hit - return cached data
    const hotels = await queryRedis(city, minPrice, maxPrice);
    const ttlRemaining = await getCacheTTL(city);
    const cacheAge = ttlRemaining > 0 ? DEFAULT_CACHE_TTL - ttlRemaining : 0;

    return {
      hotels,
      meta: {
        ...meta,
        fromCache: true,
        cacheAge,
        dataFreshness: 'cached',
      },
    };
  }

  // 2. Cache miss - fetch from suppliers with individual error handling
  let hotelsA: SupplierHotel[] = [];
  let hotelsB: SupplierHotel[] = [];

  // Use Promise.allSettled to handle individual failures
  const [resultA, resultB] = await Promise.allSettled([
    fetchSupplierA(city),
    fetchSupplierB(city),
  ]);

  // Process Supplier A result
  if (resultA.status === 'fulfilled') {
    hotelsA = resultA.value;
    meta.sources.supplierA = 'success';
  } else {
    meta.sources.supplierA = 'failed';
  }

  // Process Supplier B result
  if (resultB.status === 'fulfilled') {
    hotelsB = resultB.value;
    meta.sources.supplierB = 'success';
  } else {
    meta.sources.supplierB = 'failed';
  }

  // 3. Check if both suppliers actually failed (not just empty results)
  const bothFailed = meta.sources.supplierA === 'failed' && meta.sources.supplierB === 'failed';

  if (bothFailed) {
    // Both suppliers failed - try cache fallback
    const cachedHotels = await queryRedis(city, minPrice, maxPrice);

    if (cachedHotels.length > 0) {
      const ttlRemaining = await getCacheTTL(city);
      const cacheAge = ttlRemaining > 0 ? DEFAULT_CACHE_TTL - ttlRemaining : DEFAULT_CACHE_TTL;

      return {
        hotels: cachedHotels,
        meta: {
          ...meta,
          fromCache: true,
          cacheAge,
          warning: 'All suppliers unavailable. Showing cached data.',
          dataFreshness: 'stale',
        },
      };
    }

    // No cache, both suppliers failed - throw error
    throw new Error('All suppliers unavailable and no cached data');
  }

  // 4. If suppliers succeeded but returned empty (city has no hotels), return empty
  if (hotelsA.length === 0 && hotelsB.length === 0) {
    return {
      hotels: [],
      meta,
    };
  }

  // 5. Deduplicate whatever we got
  const deduplicated = selectBestOffers(hotelsA, hotelsB);

  // 6. Determine data freshness based on what succeeded
  if (meta.sources.supplierA === 'failed' || meta.sources.supplierB === 'failed') {
    meta.dataFreshness = 'partial';
    const failedSupplier = meta.sources.supplierA === 'failed' ? 'A' : 'B';
    meta.warning = `Partial results - Supplier ${failedSupplier} unavailable`;
  }

  // 7. Save to cache (even partial data is useful)
  await saveToRedis(city, deduplicated);

  // 8. Query Redis with price filter
  const filtered = await queryRedis(city, minPrice, maxPrice);

  return {
    hotels: filtered,
    meta,
  };
}
