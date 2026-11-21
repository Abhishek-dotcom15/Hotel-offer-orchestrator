import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './config';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hotel Offer Orchestrator API',
      version: '1.0.0',
      description: 'API for aggregating hotel offers from multiple suppliers',
    },
    servers: [
      {
        url: config.baseUrl,
        description: `${config.nodeEnv} server`,
      },
    ],
    components: {
      schemas: {
        SupplierHotel: {
          type: 'object',
          properties: {
            hotelId: { type: 'string', example: 'a-550e8400-e29b-41d4-a716-446655440000' },
            name: { type: 'string', example: 'Holtin' },
            price: { type: 'number', example: 6000 },
            city: { type: 'string', example: 'delhi' },
            commissionPct: { type: 'number', example: 10 },
          },
        },
        CreateHotel: {
          type: 'object',
          required: ['name', 'price', 'city', 'commissionPct'],
          properties: {
            name: { type: 'string', example: 'New Luxury Hotel' },
            price: { type: 'number', example: 4500 },
            city: { type: 'string', example: 'delhi' },
            commissionPct: { type: 'number', example: 15 },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'VALIDATION_ERROR' },
            message: { type: 'string', example: 'city query parameter is required' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
