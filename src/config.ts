import 'dotenv/config';

const port = parseInt(process.env.PORT || '3000', 10);

export const config = {
  port,
  nodeEnv: process.env.NODE_ENV || 'development',
  baseUrl: process.env.BASE_URL || `http://localhost:${port}`,

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: parseInt(process.env.SNAPSHOT_TTL_SECONDS || '300', 10),
  },

  temporal: {
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'hotel-offers',
  },

  suppliers: {
    baseUrl: process.env.SUPPLIER_BASE_URL || 'http://localhost:3000',
  },

  logLevel: process.env.LOG_LEVEL || 'info',
};
