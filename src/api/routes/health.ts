import { Router } from 'express';
import HealthController from '@/api/controllers/healthController';

export function createHealthRouter(controller: HealthController) {
    const router = Router();
    router.get('/', controller.getHealth);
    return router;
}

export default createHealthRouter;


