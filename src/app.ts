import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { routes } from './routes';
import { swaggerSpec } from './swagger';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(express.json());

// Swagger UI - Interactive API docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Swagger JSON spec - For Postman import
app.get('/api-docs.json', (_req, res) => {
  res.json(swaggerSpec);
});

app.use(routes);

app.use(errorHandler);

export { app };
