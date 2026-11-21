import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  setSimulation,
  getSimulation,
  getSimulationStatus,
  clearAllSimulations,
  SimulationMode,
} from '../services/simulation';

const router = Router();

// Validation schema for simulation config
const simulationSchema = z.object({
  mode: z.enum(['down', 'timeout', 'slow', 'invalid']),
  delayMs: z.number().positive().optional(),
  failureRate: z.number().min(0).max(100).optional(),
});

const supplierParamSchema = z.object({
  supplier: z.enum(['A', 'B']),
});

/**
 * @swagger
 * tags:
 *   - name: Simulation
 *     description: Runtime simulation controls for testing failure scenarios
 */

/**
 * @swagger
 * /simulation/suppliers/{supplier}/fail:
 *   post:
 *     summary: Enable failure simulation for a supplier
 *     description: |
 *       Simulates various failure modes for testing resilience:
 *       - **down**: Returns 503 immediately
 *       - **timeout**: Never responds (tests timeout handling)
 *       - **slow**: Responds after delayMs milliseconds
 *       - **invalid**: Returns malformed JSON (tests validation)
 *
 *       Use failureRate (0-100) for random failures (chaos testing).
 *     tags: [Simulation]
 *     parameters:
 *       - in: path
 *         name: supplier
 *         required: true
 *         schema:
 *           type: string
 *           enum: [A, B]
 *         description: Supplier to simulate (A or B)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mode
 *             properties:
 *               mode:
 *                 type: string
 *                 enum: [down, timeout, slow, invalid]
 *                 description: Simulation mode
 *               delayMs:
 *                 type: number
 *                 description: Delay in milliseconds (for slow mode)
 *                 example: 5000
 *               failureRate:
 *                 type: number
 *                 description: Percentage of requests that fail (0-100)
 *                 example: 50
 *           examples:
 *             down:
 *               summary: Supplier completely down
 *               value:
 *                 mode: down
 *             slow:
 *               summary: Slow response (5 seconds)
 *               value:
 *                 mode: slow
 *                 delayMs: 5000
 *             chaos:
 *               summary: 50% random failures
 *               value:
 *                 mode: down
 *                 failureRate: 50
 *     responses:
 *       200:
 *         description: Simulation enabled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 config:
 *                   type: object
 *       400:
 *         description: Invalid request
 */
router.post('/simulation/suppliers/:supplier/fail', (req: Request, res: Response) => {
  // Validate supplier param
  const paramResult = supplierParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Supplier must be A or B',
    });
    return;
  }

  // Validate body
  const bodyResult = simulationSchema.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: bodyResult.error.issues[0].message,
    });
    return;
  }

  const { supplier } = paramResult.data;
  const config = bodyResult.data;

  setSimulation(supplier, config);

  res.json({
    message: `Supplier ${supplier} simulation enabled`,
    config: getSimulation(supplier),
  });
});

/**
 * @swagger
 * /simulation/suppliers/{supplier}/fail:
 *   delete:
 *     summary: Disable failure simulation for a supplier
 *     description: Removes simulation and restores normal supplier behavior
 *     tags: [Simulation]
 *     parameters:
 *       - in: path
 *         name: supplier
 *         required: true
 *         schema:
 *           type: string
 *           enum: [A, B]
 *         description: Supplier to reset (A or B)
 *     responses:
 *       200:
 *         description: Simulation disabled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.delete('/simulation/suppliers/:supplier/fail', (req: Request, res: Response) => {
  const paramResult = supplierParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Supplier must be A or B',
    });
    return;
  }

  const { supplier } = paramResult.data;
  setSimulation(supplier, null);

  res.json({
    message: `Supplier ${supplier} simulation disabled`,
  });
});

/**
 * @swagger
 * /simulation/status:
 *   get:
 *     summary: Get current simulation status
 *     description: Shows which suppliers have active simulations
 *     tags: [Simulation]
 *     responses:
 *       200:
 *         description: Current simulation status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 active:
 *                   type: boolean
 *                   description: Whether any simulation is active
 *                 supplierA:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     mode:
 *                       type: string
 *                     delayMs:
 *                       type: number
 *                     failureRate:
 *                       type: number
 *                 supplierB:
 *                   type: object
 *                   nullable: true
 */
router.get('/simulation/status', (_req: Request, res: Response) => {
  res.json(getSimulationStatus());
});

/**
 * @swagger
 * /simulation/reset:
 *   post:
 *     summary: Clear all simulations
 *     description: Resets all suppliers to normal behavior
 *     tags: [Simulation]
 *     responses:
 *       200:
 *         description: All simulations cleared
 */
router.post('/simulation/reset', (_req: Request, res: Response) => {
  clearAllSimulations();
  res.json({
    message: 'All simulations cleared',
    status: getSimulationStatus(),
  });
});

export { router as simulationRoutes };
