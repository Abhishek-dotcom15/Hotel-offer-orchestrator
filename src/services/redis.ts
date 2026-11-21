import { createClient } from 'redis';
import { config } from '../config';
import { logger } from '../utils/logger';
import { HotelOffer } from '../domain/types';

type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | null = null;

/**
 * Get or create Redis client singleton
 */
export async function getRedisClient(): Promise<RedisClient> {
  if (!client) {
    client = createClient({ url: config.redis.url });

    client.on('error', (err) => {
      logger.error('Redis client error', { error: err.message });
    });

    client.on('connect', () => {
      logger.info('Redis client connected', { url: config.redis.url });
    });

    await client.connect();
  }
  return client;
}

/**
 * Disconnect Redis client gracefully
 */
export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
    logger.info('Redis client disconnected');
  }
}

/**
 * Save hotels to Redis sorted set with TTL
 * Key: hotels:{city}
 * Score: price
 * Member: JSON string of hotel offer
 */
export async function saveHotels(city: string, hotels: HotelOffer[]): Promise<void> {
  const redis = await getRedisClient();
  const key = `hotels:${city.toLowerCase()}`;

  // Clear old data
  await redis.del(key);

  if (hotels.length > 0) {
    // Build ZADD arguments: [{ score: price, value: JSON }]
    const members = hotels.map((hotel) => ({
      score: hotel.price,
      value: JSON.stringify(hotel),
    }));

    await redis.zAdd(key, members);
    logger.info('Saved hotels to Redis', { city, count: hotels.length, key });
  }

  // Set TTL
  await redis.expire(key, config.redis.ttl);
  logger.info('Set TTL on Redis key', { key, ttl: config.redis.ttl });
}

/**
 * Query hotels by price range using Redis ZRANGEBYSCORE
 * Price filtering happens IN REDIS, not in JavaScript
 */
export async function getHotelsByPrice(
  city: string,
  minPrice?: number,
  maxPrice?: number
): Promise<HotelOffer[]> {
  const redis = await getRedisClient();
  const key = `hotels:${city.toLowerCase()}`;

  const min = minPrice ?? 0;
  const max = maxPrice ?? '+inf';

  logger.info('Querying Redis for hotels', { city, minPrice: min, maxPrice: max, key });

  const results = await redis.zRangeByScore(key, min, max);

  const hotels = results.map((json) => JSON.parse(json) as HotelOffer);
  logger.info('Retrieved hotels from Redis', { city, count: hotels.length });

  return hotels;
}

/**
 * Check if Redis has data for a city
 */
export async function hasHotelsForCity(city: string): Promise<boolean> {
  const redis = await getRedisClient();
  const key = `hotels:${city.toLowerCase()}`;
  const count = await redis.zCard(key);
  return count > 0;
}

/**
 * Get TTL remaining for a city's hotel data
 */
export async function getTTL(city: string): Promise<number> {
  const redis = await getRedisClient();
  const key = `hotels:${city.toLowerCase()}`;
  return await redis.ttl(key);
}
