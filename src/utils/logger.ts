import winston from 'winston';
import { config } from '../config';

const { combine, timestamp, json, errors } = winston.format;

export const logger = winston.createLogger({
  level: config.logLevel,
  format: combine(
    errors({ stack: true }),
    timestamp(),
    json()
  ),
  defaultMeta: { service: 'hotel-offer-orchestrator' },
  transports: [
    new winston.transports.Console(),
  ],
});
