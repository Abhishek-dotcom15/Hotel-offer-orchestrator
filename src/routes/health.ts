import { Router, Request, Response } from 'express';
import { getRedisClient } from '../services/redis';
import { Connection } from '@temporalio/client';
import { config } from '../config';
import { getSimulationStatus, SimulationStatus } from '../services/simulation';

const router = Router();

interface HealthStatus {
  status: 'ok' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    redis: 'connected' | 'disconnected';
    temporal: 'connected' | 'disconnected';
  };
  config: {
    cacheTTL: number;
    temporalTaskQueue: string;
  };
  simulation: SimulationStatus;
}

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Check the health status of the API, dependencies (Redis, Temporal), and active simulations
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [ok, degraded, unhealthy]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 services:
 *                   type: object
 *                   properties:
 *                     redis:
 *                       type: string
 *                       enum: [connected, disconnected]
 *                     temporal:
 *                       type: string
 *                       enum: [connected, disconnected]
 *                 config:
 *                   type: object
 *                   properties:
 *                     cacheTTL:
 *                       type: number
 *                     temporalTaskQueue:
 *                       type: string
 *                 simulation:
 *                   type: object
 *                   description: Current simulation status
 *                   properties:
 *                     active:
 *                       type: boolean
 *                       description: Whether any simulation is active
 *                     supplierA:
 *                       type: object
 *                       nullable: true
 *                     supplierB:
 *                       type: object
 *                       nullable: true
 *       503:
 *         description: Service is unhealthy
 */
router.get('/health', async (_req: Request, res: Response) => {
  const health: HealthStatus = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      redis: 'disconnected',
      temporal: 'disconnected',
    },
    config: {
      cacheTTL: config.redis.ttl,
      temporalTaskQueue: config.temporal.taskQueue,
    },
    simulation: getSimulationStatus(),
  };

  // Check Redis
  try {
    const redis = await getRedisClient();
    await redis.ping();
    health.services.redis = 'connected';
  } catch {
    health.services.redis = 'disconnected';
  }

  // Check Temporal
  try {
    const connection = await Connection.connect({
      address: config.temporal.address,
    });
    await connection.close();
    health.services.temporal = 'connected';
  } catch {
    health.services.temporal = 'disconnected';
  }

  // Determine overall status
  const allConnected = health.services.redis === 'connected' && health.services.temporal === 'connected';
  const allDisconnected = health.services.redis === 'disconnected' && health.services.temporal === 'disconnected';

  if (allConnected) {
    health.status = 'ok';
  } else if (allDisconnected) {
    health.status = 'unhealthy';
  } else {
    health.status = 'degraded';
  }

  const statusCode = health.status === 'unhealthy' ? 503 : 200;
  res.status(statusCode).json(health);
});

export { router as healthRoutes };
