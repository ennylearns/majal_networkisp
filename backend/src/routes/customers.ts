import { Router, Request, Response, NextFunction } from 'express';
import { CustomerService } from '../services/CustomerService';
import { requireAdmin } from '../middleware/auth';
import { ValidationError } from '../errors';

export function createCustomerRouter(customerService: CustomerService): Router {
  const router = Router();

  // All customer routes require admin authentication
  router.use(requireAdmin);

  // GET /api/customers - List all customers with transactions
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customers = await customerService.findAll();
      return res.json(customers);
    } catch (error) {
      next(error);
    }
  });

  // GET /api/customers/:id - Single customer inspection with transactions
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new ValidationError('Invalid customer ID');
      }
      const customer = await customerService.getById(id);
      return res.json(customer);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
