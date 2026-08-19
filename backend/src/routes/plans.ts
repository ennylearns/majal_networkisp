import { Router, Request, Response, NextFunction } from 'express';
import { PlanService, normalizePlanForPortal } from '../services/PlanService';
import { requireAdmin, getAdminId } from '../middleware/auth';
import { ValidationError } from '../errors';

export function createPlanRouter(planService: PlanService): Router {
  const router = Router();

  // GET /api/plans - Public / Portal listing
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const plans = await planService.findAll();
      return res.json(plans.map(normalizePlanForPortal));
    } catch (error) {
      next(error);
    }
  });

  // GET /api/plans/:id - Single plan inspection
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new ValidationError('Invalid plan ID');
      }
      const plan = await planService.getById(id);
      return res.json(plan);
    } catch (error) {
      next(error);
    }
  });

  // POST /api/plans - Admin create plan
  router.post('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, price, data_allowance, duration, download_speed, upload_speed } = req.body;
      const plan = await planService.create(
        { name, price, data_allowance, duration, download_speed, upload_speed },
        getAdminId(req)
      );
      return res.status(201).json({ plan });
    } catch (error) {
      next(error);
    }
  });

  // PUT /api/plans/:id/enable - Admin enable plan
  router.put('/:id/enable', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new ValidationError('Invalid plan ID');
      }
      const plan = await planService.enable(id, getAdminId(req));
      return res.json({ plan });
    } catch (error) {
      next(error);
    }
  });

  // PUT /api/plans/:id/disable - Admin disable plan
  router.put('/:id/disable', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new ValidationError('Invalid plan ID');
      }
      const plan = await planService.disable(id, getAdminId(req));
      return res.json({ plan });
    } catch (error) {
      next(error);
    }
  });

  // PUT /api/plans/:id - Admin update plan
  router.put('/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new ValidationError('Invalid plan ID');
      }
      const plan = await planService.update(id, req.body, getAdminId(req));
      return res.json({ plan });
    } catch (error) {
      next(error);
    }
  });

  // DELETE /api/plans/:id - Admin delete plan
  router.delete('/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new ValidationError('Invalid plan ID');
      }
      const plan = await planService.delete(id, getAdminId(req));
      return res.json({ success: true, plan });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
