import { Router, Request, Response, NextFunction } from 'express';
import { RouterService } from '../services/RouterService';
import { requireAdmin, getAdminId } from '../middleware/auth';
import { ValidationError } from '../errors';

export function createRouterRouter(routerService: RouterService): Router {
  const router = Router();

  // POST /api/routers - Register new router and start provisioning
  router.post('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await routerService.create(req.body, req.get('host'), getAdminId(req));
      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  // GET /api/routers - List all routers
  router.get('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const routers = await routerService.findAll();
      return res.json(routers);
    } catch (error) {
      next(error);
    }
  });

  // POST /api/routers/:id/provision-token - Generate new provisioning credentials
  router.post('/:id/provision-token', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const routerId = parseInt(req.params.id as string, 10);
      if (isNaN(routerId)) {
        throw new ValidationError('Invalid router ID');
      }
      const result = await routerService.generateProvisioningToken(routerId, req.get('host'), getAdminId(req));
      return res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // GET /api/routers/:id/provision.rsc - Fetch raw RSC provisioning script
  router.get('/:id/provision.rsc', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const routerId = parseInt(req.params.id as string, 10);
      if (isNaN(routerId)) {
        throw new ValidationError('Invalid router ID');
      }
      const script = await routerService.generateRscScriptForRouter(routerId, req.get('host'));
      return res.type('text/plain').send(script);
    } catch (error) {
      next(error);
    }
  });

  // POST /api/routers/:id/revoke-token - Revoke active token for router
  router.post('/:id/revoke-token', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const routerId = parseInt(req.params.id as string, 10);
      if (isNaN(routerId)) {
        throw new ValidationError('Invalid router ID');
      }
      await routerService.revokeToken(routerId);
      return res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
