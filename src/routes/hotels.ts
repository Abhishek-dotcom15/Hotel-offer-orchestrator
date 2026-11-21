import { Router, Request, Response, NextFunction } from 'express';
import { hotelQuerySchema } from '../validation/querySchema';
import { executeHotelWorkflow } from '../temporal/client';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /api/hotels:
 *   get:
 *     summary: Get aggregated hotel offers
 *     description: |
 *       Fetches hotels from both suppliers, deduplicates by name (lowest price wins, then highest commission),
 *       and filters by price range. Returns data with meta information about source and freshness.
 *
 *       **Resilience Features:**
 *       - If one supplier fails, returns partial results from the other
 *       - If both suppliers fail, falls back to cached data
 *       - Meta field indicates data freshness: live, partial, cached, or stale
 *     tags: [Hotels]
 *     parameters:
 *       - in: query
 *         name: city
 *         required: true
 *         schema:
 *           type: string
 *         description: City name to search hotels
 *         example: delhi
 *       - in: query
 *         name: minPrice
 *         required: false
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *         example: 4000
 *       - in: query
 *         name: maxPrice
 *         required: false
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *         example: 6000
 *     responses:
 *       200:
 *         description: Hotel offers with meta information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hotels:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       hotelId:
 *                         type: string
 *                       name:
 *                         type: string
 *                       price:
 *                         type: number
 *                       city:
 *                         type: string
 *                       commissionPct:
 *                         type: number
 *                       supplier:
 *                         type: string
 *                         enum: [A, B]
 *                 meta:
 *                   type: object
 *                   properties:
 *                     sources:
 *                       type: object
 *                       properties:
 *                         supplierA:
 *                           type: string
 *                           enum: [success, failed, skipped]
 *                         supplierB:
 *                           type: string
 *                           enum: [success, failed, skipped]
 *                     fromCache:
 *                       type: boolean
 *                     cacheAge:
 *                       type: number
 *                       description: Seconds since data was cached
 *                     warning:
 *                       type: string
 *                       description: Warning message if data is degraded
 *                     dataFreshness:
 *                       type: string
 *                       enum: [live, partial, cached, stale]
 *                       description: |
 *                         - live: Both suppliers responded successfully
 *                         - partial: One supplier failed, data from other
 *                         - cached: Returned from cache (within TTL)
 *                         - stale: Cache fallback when both suppliers fail
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       503:
 *         description: Service unavailable - all suppliers down and no cache
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: SERVICE_UNAVAILABLE
 *                 message:
 *                   type: string
 *                   example: All suppliers unavailable and no cached data
 */
router.get('/api/hotels', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate query parameters
    const result = hotelQuerySchema.safeParse(req.query);

    if (!result.success) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: result.error.issues[0].message,
      });
      return;
    }

    const { city, minPrice, maxPrice } = result.data;

    logger.info('Hotel search request', { city, minPrice, maxPrice });

    // Execute Temporal workflow
    const response = await executeHotelWorkflow(city, minPrice, maxPrice);

    logger.info('Hotel search complete', {
      city,
      count: response.hotels.length,
      dataFreshness: response.meta.dataFreshness,
      fromCache: response.meta.fromCache,
    });

    res.json(response);
  } catch (error) {
    // Handle specific error for all suppliers down
    if (error instanceof Error && error.message.includes('All suppliers unavailable')) {
      res.status(503).json({
        error: 'SERVICE_UNAVAILABLE',
        message: error.message,
      });
      return;
    }
    next(error);
  }
});

export { router as hotelRoutes };
