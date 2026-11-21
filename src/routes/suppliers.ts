import { Router, Request, Response } from 'express';
import { supplierAHotels, addHotelToSupplierA } from '../data/supplierA';
import { supplierBHotels, addHotelToSupplierB } from '../data/supplierB';
import { supplierQuerySchema, createHotelSchema } from '../validation/supplierSchema';
import { getSimulation, sleep, shouldRandomlyFail } from '../services/simulation';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Apply simulation if configured for a supplier
 * Returns true if request was handled (should stop processing)
 */
async function applySimulation(
  supplier: 'A' | 'B',
  res: Response
): Promise<boolean> {
  const sim = getSimulation(supplier);

  if (!sim) {
    return false; // No simulation, continue normally
  }

  // Check for random failure rate
  if (sim.failureRate && !shouldRandomlyFail(sim.failureRate)) {
    // Random check passed, continue normally (but still apply delay if slow mode)
    if (sim.mode === 'slow' && sim.delayMs) {
      logger.info('Simulation: applying delay', { supplier, delayMs: sim.delayMs });
      await sleep(sim.delayMs);
    }
    return false;
  }

  logger.info('Simulation: applying failure', { supplier, mode: sim.mode });

  switch (sim.mode) {
    case 'down':
      res.status(503).json({
        error: 'SERVICE_UNAVAILABLE',
        message: `Supplier ${supplier} is currently unavailable (simulated)`,
      });
      return true;

    case 'timeout':
      // Never respond - let the client timeout
      // This simulates a hanging connection
      logger.info('Simulation: timeout mode - not responding', { supplier });
      return true;

    case 'slow':
      if (sim.delayMs) {
        logger.info('Simulation: slow mode - delaying response', { supplier, delayMs: sim.delayMs });
        await sleep(sim.delayMs);
      }
      return false; // Continue to normal response after delay

    case 'invalid':
      // Return malformed response to test validation
      res.json({ invalid: 'data', notAnArray: true });
      return true;

    default:
      return false;
  }
}

/**
 * @swagger
 * /supplierA/hotels:
 *   get:
 *     summary: Get hotels from Supplier A
 *     description: |
 *       Returns hotels from Supplier A filtered by city.
 *       Supports simulation via /simulation endpoints for testing.
 *     tags: [Supplier A]
 *     parameters:
 *       - in: query
 *         name: city
 *         required: true
 *         schema:
 *           type: string
 *         description: City name to filter hotels
 *         example: delhi
 *     responses:
 *       200:
 *         description: List of hotels
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SupplierHotel'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       503:
 *         description: Service unavailable (simulated)
 */
router.get('/supplierA/hotels', async (req: Request, res: Response) => {
  // Check simulation first
  if (await applySimulation('A', res)) {
    return;
  }

  const result = supplierQuerySchema.safeParse(req.query);

  if (!result.success) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: result.error.issues[0].message,
    });
    return;
  }

  const { city } = result.data;
  const hotels = supplierAHotels.filter(
    (h) => h.city.toLowerCase() === city.toLowerCase()
  );

  res.json(hotels);
});

/**
 * @swagger
 * /supplierA/hotels:
 *   post:
 *     summary: Add a new hotel to Supplier A
 *     tags: [Supplier A]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateHotel'
 *     responses:
 *       201:
 *         description: Hotel created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SupplierHotel'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
router.post('/supplierA/hotels', (req: Request, res: Response) => {
  const result = createHotelSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: result.error.issues[0].message,
    });
    return;
  }

  const newHotel = addHotelToSupplierA(result.data);
  res.status(201).json(newHotel);
});

/**
 * @swagger
 * /supplierB/hotels:
 *   get:
 *     summary: Get hotels from Supplier B
 *     description: |
 *       Returns hotels from Supplier B filtered by city.
 *       Supports simulation via /simulation endpoints for testing.
 *     tags: [Supplier B]
 *     parameters:
 *       - in: query
 *         name: city
 *         required: true
 *         schema:
 *           type: string
 *         description: City name to filter hotels
 *         example: delhi
 *     responses:
 *       200:
 *         description: List of hotels
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SupplierHotel'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       503:
 *         description: Service unavailable (simulated)
 */
router.get('/supplierB/hotels', async (req: Request, res: Response) => {
  // Check simulation first
  if (await applySimulation('B', res)) {
    return;
  }

  const result = supplierQuerySchema.safeParse(req.query);

  if (!result.success) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: result.error.issues[0].message,
    });
    return;
  }

  const { city } = result.data;
  const hotels = supplierBHotels.filter(
    (h) => h.city.toLowerCase() === city.toLowerCase()
  );

  res.json(hotels);
});

/**
 * @swagger
 * /supplierB/hotels:
 *   post:
 *     summary: Add a new hotel to Supplier B
 *     tags: [Supplier B]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateHotel'
 *     responses:
 *       201:
 *         description: Hotel created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SupplierHotel'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
router.post('/supplierB/hotels', (req: Request, res: Response) => {
  const result = createHotelSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: result.error.issues[0].message,
    });
    return;
  }

  const newHotel = addHotelToSupplierB(result.data);
  res.status(201).json(newHotel);
});

export { router as supplierRoutes };
