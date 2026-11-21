import { Worker, NativeConnection } from '@temporalio/worker';
import { config } from '../config';
import { logger } from '../utils/logger';
import * as activities from './activities';

async function runWorker() {
  logger.info('Starting Temporal worker', {
    address: config.temporal.address,
    namespace: config.temporal.namespace,
    taskQueue: config.temporal.taskQueue,
  });

  // Connect to Temporal server
  const connection = await NativeConnection.connect({
    address: config.temporal.address,
  });

  // Create worker
  const worker = await Worker.create({
    connection,
    namespace: config.temporal.namespace,
    taskQueue: config.temporal.taskQueue,
    workflowsPath: require.resolve('./workflows'),
    activities,
  });

  logger.info('Temporal worker started successfully');

  // Start listening for tasks
  await worker.run();
}

// Run the worker
runWorker().catch((err) => {
  logger.error('Worker failed', { error: err.message });
  process.exit(1);
});
