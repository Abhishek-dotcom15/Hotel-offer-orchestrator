import { Router } from 'express';
import { supplierRoutes } from './suppliers';
import { hotelRoutes } from './hotels';
import { healthRoutes } from './health';
import { simulationRoutes } from './simulation';

const router = Router();

router.use(healthRoutes);
router.use(simulationRoutes);
router.use(supplierRoutes);
router.use(hotelRoutes);

export { router as routes };
