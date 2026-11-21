import { Client, Connection } from '@temporalio/client';
import { config } from '../config';
import { logger } from '../utils/logger';
import { hotelOfferWorkflow } from './workflows';
import { HotelResponse } from '../domain/types';

let client: Client | null = null;

/**
 * Get or create Temporal client singleton
 */
export async function getTemporalClient(): Promise<Client> {
  if (!client) {
    logger.info('Connecting to Temporal', {
      address: config.temporal.address,
      namespace: config.temporal.namespace,
    });

    const connection = await Connection.connect({
      address: config.temporal.address,
    });

    client = new Client({
      connection,
      namespace: config.temporal.namespace,
    });

    logger.info('Temporal client connected');
  }
  return client;
}

/**
 * Execute hotel offer workflow
 */
export async function executeHotelWorkflow(
  city: string,
  minPrice?: number,
  maxPrice?: number
): Promise<HotelResponse> {
  const temporalClient = await getTemporalClient();

  const workflowId = `hotel-offers-${city}-${Date.now()}`;

  logger.info('Starting hotel workflow', {
    workflowId,
    city,
    minPrice,
    maxPrice,
  });

  const result = await temporalClient.workflow.execute(hotelOfferWorkflow, {
    taskQueue: config.temporal.taskQueue,
    workflowId,
    args: [city, minPrice, maxPrice],
  });

  logger.info('Hotel workflow completed', {
    workflowId,
    city,
    resultCount: result.hotels.length,
    dataFreshness: result.meta.dataFreshness,
  });

  return result;
}

/**
 * Close Temporal client connection
 */
export async function closeTemporalClient(): Promise<void> {
  if (client) {
    await client.connection.close();
    client = null;
    logger.info('Temporal client disconnected');
  }
}
