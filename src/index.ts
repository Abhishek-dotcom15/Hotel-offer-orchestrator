import { config } from './config';
import { app } from './app';
import { logger } from './utils/logger';

app.listen(config.port, () => {
  logger.info('Server started', {
    port: config.port,
    environment: config.nodeEnv,
  });
});
