import { logger } from '../../utils/logger';
import { HotelOffer } from '../../domain/types';
import { saveHotels, getHotelsByPrice, hasHotelsForCity, getTTL } from '../../services/redis';

/**
 * Activity: Save deduplicated hotels to Redis
 */
export async function saveToRedis(
  city: string,
  hotels: HotelOffer[]
): Promise<void> {
  logger.info('Saving hotels to Redis', { city, count: hotels.length });

  await saveHotels(city, hotels);

  logger.info('Hotels saved to Redis', { city, count: hotels.length });
}

/**
 * Activity: Query hotels from Redis by price range
 */
export async function queryRedis(
  city: string,
  minPrice?: number,
  maxPrice?: number
): Promise<HotelOffer[]> {
  logger.info('Querying hotels from Redis', { city, minPrice, maxPrice });

  const hotels = await getHotelsByPrice(city, minPrice, maxPrice);

  logger.info('Hotels retrieved from Redis', { city, count: hotels.length });

  return hotels;
}

/**
 * Activity: Check if cache exists for a city
 */
export async function checkCacheExists(city: string): Promise<boolean> {
  logger.info('Checking cache existence', { city });

  const exists = await hasHotelsForCity(city);

  logger.info('Cache check complete', { city, exists });

  return exists;
}

/**
 * Activity: Get remaining TTL for a city's cache
 * Returns -2 if key doesn't exist, -1 if no expiry, otherwise seconds remaining
 */
export async function getCacheTTL(city: string): Promise<number> {
  logger.info('Getting cache TTL', { city });

  const ttl = await getTTL(city);

  logger.info('Cache TTL retrieved', { city, ttl });

  return ttl;
}
