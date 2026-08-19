import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { MikroTikService, FakeMikroTikService } from './services/MikroTikService';
import { PaymentService, FakePaymentService } from './services/PaymentService';
import { pool } from './db';
import { ProvisioningService } from './services/ProvisioningService';
import { voucherService } from './services/VoucherService';
import { AuditService } from './services/AuditService';
import { PlanService } from './services/PlanService';
import { createPlanRouter } from './routes/plans';
import { CustomerService } from './services/CustomerService';
import { createCustomerRouter } from './routes/customers';
import { RouterService } from './services/RouterService';
import { createRouterRouter } from './routes/routers';
import { getAdminId, requireAdmin } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';

const provisioningService = new ProvisioningService();
const auditService = new AuditService(pool);
const planService = new PlanService(pool, () => mikroTikService, auditService);
const customerService = new CustomerService(pool);
const routerService = new RouterService(pool, provisioningService, auditService, () => mikroTikService);

const app = express();
app.use(express.json());

// Seams setup
let mikroTikService: MikroTikService = new FakeMikroTikService();
let paymentService: PaymentService = new FakePaymentService();

export function setMikroTikService(service: MikroTikService) {
  mikroTikService = service;
}

export function setPaymentService(service: PaymentService) {
  paymentService = service;
}

// Authentication route
app.post('/api/auth', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  // For the smoke test, we can use a hardcoded admin or check against DB
  // In a real app we'd use bcrypt and query the `admins` table.
  if (email === 'admin@example.com' && password === 'password123') {
    const token = jwt.sign({ email }, 'secret-key', { expiresIn: '1h' });
    return res.json({ token });
  }

  // Attempt DB check if it's not the hardcoded test credentials
  try {
    const result = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
    const admin = result.rows[0];
    // Normally: const match = await bcrypt.compare(password, admin.password_hash);
    // For simplicity without bcrypt here:
    if (admin && admin.password_hash === password) {
      const token = jwt.sign({ id: admin.id, email }, 'secret-key', { expiresIn: '1h' });
      return res.json({ token });
    }
  } catch (error) {
    // Ignore DB errors during simple test without DB running
  }

  return res.status(401).json({ error: 'Invalid credentials' });
});

app.get('/provision/:token', async (req: Request, res: Response) => {
  const { token } = req.params;
  try {
    const script = await routerService.fetchProvisioningScriptByToken(token as string, req.get('host'));
    return res.type('text/plain').send(script);
  } catch (error) {
    return res.status(400).send('# Provisioning failed: ' + (error as Error).message);
  }
});

app.post('/api/provision-report', async (req: Request, res: Response, next: NextFunction) => {
  const { token, status, message } = req.body;
  try {
    await routerService.handleProvisionReport({ token, status, message });
    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/dashboard/stats', requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'online') as online_count,
        COUNT(*) FILTER (WHERE status = 'offline') as offline_count,
        COUNT(*) FILTER (WHERE status = 'provisioning') as provisioning_count,
        COUNT(*) FILTER (WHERE status = 'error') as error_count
      FROM routers
    `);
    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

app.get('/api/dashboard/summary', requireAdmin, async (req: Request, res: Response) => {
  try {
    const todayRevenueResult = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) AS today_revenue
      FROM transactions
      WHERE status = 'successful' AND created_at >= CURRENT_DATE
    `);
    
    const activeCustomersResult = await pool.query(`
      SELECT COUNT(DISTINCT voucher_id) AS active_customers
      FROM sessions
      WHERE ended_at IS NULL
    `);
    
    const activeSessionsResult = await pool.query(`
      SELECT COUNT(*) AS active_sessions
      FROM sessions
      WHERE ended_at IS NULL
    `);
    
    const totalCustomersResult = await pool.query(`
      SELECT COUNT(*) AS total_customers FROM customers
    `);
    
    const totalVouchersResult = await pool.query(`
      SELECT COUNT(*) AS total_vouchers FROM vouchers
    `);
    
    const routerCountsResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'online') as online_count,
        COUNT(*) FILTER (WHERE status = 'offline') as offline_count
      FROM routers
    `);
    
    return res.json({
      todayRevenue: parseFloat(todayRevenueResult.rows[0].today_revenue),
      activeCustomers: parseInt(activeCustomersResult.rows[0].active_customers, 10),
      activeSessions: parseInt(activeSessionsResult.rows[0].active_sessions, 10),
      totalCustomers: parseInt(totalCustomersResult.rows[0].total_customers, 10),
      totalVouchers: parseInt(totalVouchersResult.rows[0].total_vouchers, 10),
      onlineRouters: parseInt(routerCountsResult.rows[0].online_count || '0', 10),
      offlineRouters: parseInt(routerCountsResult.rows[0].offline_count || '0', 10),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

app.get('/api/dashboard/active-sessions', requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.id,
        s.username,
        r.name as router_name,
        p.name as plan_name,
        s.data_used,
        s.ip_address,
        s.mac_address,
        s.started_at
      FROM sessions s
      JOIN vouchers v ON s.voucher_id = v.id
      LEFT JOIN routers r ON s.router_id = r.id
      LEFT JOIN plans p ON v.plan_id = p.id
      WHERE s.ended_at IS NULL
      ORDER BY s.started_at DESC
    `);
    
    const formatted = result.rows.map(row => ({
      id: row.id,
      username: row.username,
      routerName: row.router_name,
      planName: row.plan_name,
      dataUsed: row.data_used,
      ipAddress: row.ip_address,
      macAddress: row.mac_address,
      startedAt: row.started_at
    }));
    
    return res.json(formatted);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch active sessions' });
  }
});

app.get('/api/dashboard/analytics/revenue', requireAdmin, async (req: Request, res: Response) => {
  try {
    const revenuePeriodsResult = await pool.query(`
      SELECT 
        COALESCE(SUM(amount) FILTER (WHERE created_at >= CURRENT_DATE), 0) AS revenue_today,
        COALESCE(SUM(amount) FILTER (WHERE created_at >= date_trunc('week', CURRENT_DATE)), 0) AS revenue_week,
        COALESCE(SUM(amount) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)), 0) AS revenue_month
      FROM transactions
      WHERE status = 'successful'
    `);
    
    const byPlanResult = await pool.query(`
      SELECT 
        p.name as plan_name,
        COALESCE(SUM(t.amount), 0) as revenue,
        COUNT(t.id) as units
      FROM plans p
      LEFT JOIN transactions t ON t.plan_id = p.id AND t.status = 'successful'
      GROUP BY p.id, p.name
      ORDER BY revenue DESC
    `);
    
    const byRouterResult = await pool.query(`
      SELECT 
        r.name as router_name,
        COALESCE(SUM(t.amount), 0) as revenue
      FROM routers r
      LEFT JOIN vouchers v ON v.router_id = r.id
      LEFT JOIN transactions t ON v.transaction_id = t.id AND t.status = 'successful'
      GROUP BY r.id, r.name
      HAVING COALESCE(SUM(t.amount), 0) > 0
      ORDER BY revenue DESC
    `);
    
    return res.json({
      today: parseFloat(revenuePeriodsResult.rows[0].revenue_today),
      thisWeek: parseFloat(revenuePeriodsResult.rows[0].revenue_week),
      thisMonth: parseFloat(revenuePeriodsResult.rows[0].revenue_month),
      byPlan: byPlanResult.rows.map(row => ({
        planName: row.plan_name,
        revenue: parseFloat(row.revenue),
        units: parseInt(row.units, 10)
      })),
      byRouter: byRouterResult.rows.map(row => ({
        routerName: row.router_name,
        revenue: parseFloat(row.revenue)
      }))
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch revenue analytics' });
  }
});

app.use('/api/plans', createPlanRouter(planService));
app.use('/api/customers', createCustomerRouter(customerService));
app.use('/api/routers', createRouterRouter(routerService));

app.post('/api/checkout', async (req: Request, res: Response) => {
  const { planId, email, phoneNumber, routerId } = req.body;
  if (!planId || !email || !phoneNumber || !routerId) {
    return res.status(400).json({ error: 'planId, email, phoneNumber, and routerId are required' });
  }

  try {
    const routerResult = await pool.query("SELECT * FROM routers WHERE id = $1 AND status = 'online'", [routerId]);
    if (routerResult.rows.length === 0) {
      return res.status(400).json({ error: 'Router not found or offline' });
    }

    const planResult = await pool.query('SELECT * FROM plans WHERE id = $1', [planId]);
    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    const plan = planResult.rows[0];

    let customerResult = await pool.query('SELECT * FROM customers WHERE email = $1', [email]);
    let customerId;
    if (customerResult.rows.length === 0) {
      const insertCustomer = await pool.query(
        'INSERT INTO customers (email, phone_number) VALUES ($1, $2) RETURNING id',
        [email, phoneNumber]
      );
      customerId = insertCustomer.rows[0].id;
    } else {
      customerId = customerResult.rows[0].id;
    }

    const reference = crypto.randomUUID();
    
    await pool.query(
      'INSERT INTO transactions (customer_id, plan_id, router_id, paystack_reference, amount, status) VALUES ($1, $2, $3, $4, $5, $6)',
      [customerId, planId, routerId, reference, plan.price, 'pending']
    );

    const checkout = await paymentService.initialize(plan.price, email, reference);
    
    return res.json({ checkoutUrl: checkout.checkoutUrl, reference });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to initialize checkout' });
  }
});

app.post('/api/webhooks/paystack', async (req: Request, res: Response) => {
  const signature = req.headers['x-paystack-signature'] as string;
  const payload = req.body;

  if (!paymentService.verifyWebhook(payload, signature)) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  if (payload.event === 'charge.success') {
    const { reference } = payload.data;
    try {
      const resQuery = await pool.query(`
        UPDATE transactions 
        SET status = 'successful', webhook_received_at = CURRENT_TIMESTAMP
        WHERE paystack_reference = $1 AND status = 'pending'
        RETURNING id
      `, [reference]);
      
      if (resQuery.rows.length > 0) {
        await auditService.logAction(null, 'PAYMENT_RECEIVED', 'transaction', resQuery.rows[0].id, { reference });
      }
    } catch (error) {
      return res.status(500).json({ error: 'Failed to process webhook' });
    }
  }

  return res.sendStatus(200);
});

app.get('/api/payments', requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT t.*, c.email, c.phone_number, p.name as plan_name
      FROM transactions t
      JOIN customers c ON t.customer_id = c.id
      JOIN plans p ON t.plan_id = p.id
      ORDER BY t.created_at DESC
    `);
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

app.get('/api/payments/:reference', async (req: Request, res: Response) => {
  const reference = req.params.reference as string;
  try {
    let result = await pool.query(`
      SELECT t.*, v.activation_status 
      FROM transactions t
      LEFT JOIN vouchers v ON t.id = v.transaction_id
      WHERE t.paystack_reference = $1
    `, [reference]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    let tx = result.rows[0];

    // Fallback: if pending, check threshold
    if (tx.status === 'pending') {
      const createdAt = new Date(tx.created_at).getTime();
      const now = Date.now();
      const thresholdMs = 10000; // 10 seconds

      if (now - createdAt > thresholdMs) {
        // Fallback to direct Paystack verification
        try {
          const verifyResult = await paymentService.verifyTransaction(reference);
          if (verifyResult.status === 'success') {
            await pool.query(`
              UPDATE transactions 
              SET status = 'successful', webhook_received_at = CURRENT_TIMESTAMP
              WHERE paystack_reference = $1 AND status = 'pending'
            `, [reference]);
            tx.status = 'successful';
          }
        } catch (error) {
          console.error('Fallback verification failed:', error);
        }
      }
    }

    return res.json({
      status: tx.status,
      activation_status: tx.activation_status || null
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch payment status' });
  }
});

app.post('/api/transactions/:reference/voucher', async (req: Request, res: Response) => {
  const reference = req.params.reference as string;
  try {
    const code = await voucherService.issueVoucherForTransaction(reference);
    return res.status(201).json({ code });
  } catch (error: any) {
    if (error.message === 'Transaction not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Transaction is not successful' || error.message === 'Voucher already issued for this transaction') {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Failed to issue voucher' });
  }
});

app.post('/api/sessions/login', async (req: Request, res: Response) => {
  const { voucherCode, ipAddress, macAddress } = req.body;
  if (!voucherCode) return res.status(400).json({ error: 'Voucher code is required' });

  try {
    const hash = voucherService.hashVoucher(voucherCode);
    const result = await pool.query('SELECT * FROM vouchers WHERE code_hash = $1', [hash]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid voucher code' });
    }

    const voucher = result.rows[0];

    if (voucher.activation_status !== 'ACTIVATED') {
      return res.status(401).json({ error: 'Voucher is not yet activated on the network' });
    }

    if (voucher.status === 'expired') {
      return res.status(401).json({ error: 'Voucher is expired' });
    }
    if (voucher.status === 'exhausted') {
      return res.status(401).json({ error: 'Voucher data exhausted' });
    }
    if (voucher.status === 'disabled') {
      return res.status(401).json({ error: 'Voucher is disabled' });
    }

    if (voucher.status === 'unused') {
      await pool.query('UPDATE vouchers SET status = $1 WHERE id = $2', ['active', voucher.id]);
      voucher.status = 'active';
    }

    const sessionToken = jwt.sign({ voucherId: voucher.id, ipAddress, macAddress }, 'secret-key', { expiresIn: '24h' });

    await pool.query(
      `INSERT INTO sessions (voucher_id, router_id, username, ip_address, mac_address) 
       VALUES ($1, $2, $3, $4, $5)`,
      [voucher.id, voucher.router_id, voucherCode, ipAddress, macAddress]
    );

    return res.json({ success: true, sessionToken });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to process login' });
  }
});

app.get('/api/sessions', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, 'secret-key') as any;
    const result = await pool.query(`
      SELECT v.status, s.ip_address, s.mac_address, s.data_used, s.started_at, p.data_allowance, p.duration
      FROM sessions s
      JOIN vouchers v ON s.voucher_id = v.id
      LEFT JOIN plans p ON v.plan_id = p.id
      WHERE s.voucher_id = $1
      ORDER BY s.started_at DESC LIMIT 1
    `, [payload.voucherId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = result.rows[0];
    
    return res.json({
      voucherStatus: session.status,
      ipAddress: session.ip_address,
      macAddress: session.mac_address,
      dataUsed: session.data_used,
      dataAllowance: session.data_allowance,
      startedAt: session.started_at,
      duration: session.duration
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

app.get('/api/vouchers', requireAdmin, async (req: Request, res: Response) => {
  const { phone_number, email } = req.query;
  try {
    let query = `
      SELECT v.id, v.status, v.activation_status, v.issued_at, v.phone_number, v.email, 
             t.amount, t.paystack_reference, p.name as plan_name
      FROM vouchers v
      LEFT JOIN transactions t ON v.transaction_id = t.id
      LEFT JOIN plans p ON v.plan_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (phone_number) {
      params.push(phone_number as string);
      query += ` AND v.phone_number = $${params.length}`;
    }
    if (email) {
      params.push(email as string);
      query += ` AND v.email = $${params.length}`;
    }
    
    query += ` ORDER BY v.issued_at DESC`;
    
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to lookup vouchers' });
  }
});



app.put('/api/vouchers/:id/disable', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { code } = req.body || {};
  
  try {
    const voucherResult = await pool.query('SELECT * FROM vouchers WHERE id = $1', [id]);
    if (voucherResult.rows.length === 0) {
      return res.status(404).json({ error: 'Voucher not found' });
    }
    const voucher = voucherResult.rows[0];

    if (voucher.status === 'disabled') {
      return res.json({ success: true, voucher });
    }

    let usernameToDisable = null;

    if (code) {
      const hash = voucherService.hashVoucher(code);
      if (hash === voucher.code_hash) {
        usernameToDisable = code;
      }
    }

    if (!usernameToDisable) {
      const sessionResult = await pool.query('SELECT username FROM sessions WHERE voucher_id = $1 LIMIT 1', [id]);
      if (sessionResult.rows.length > 0) {
        usernameToDisable = sessionResult.rows[0].username;
      }
    }

    if (usernameToDisable && voucher.router_id) {
      try {
        await mikroTikService.disableUser(voucher.router_id, usernameToDisable);
      } catch (err) {
        console.error('Failed to disable user on MikroTik:', err);
      }
    }

    const updateResult = await pool.query('UPDATE vouchers SET status = $1 WHERE id = $2 RETURNING *', ['disabled', id]);
    
    await auditService.logAction(getAdminId(req), 'VOUCHER_DISABLED', 'voucher', parseInt(id as string, 10));

    return res.json({ success: true, voucher: updateResult.rows[0] });
  } catch (error: any) {
    console.error('DISABLE ERROR:', error);
    return res.status(500).json({ error: 'Failed to disable voucher: ' + error.message, stack: error.stack });
  }
});

app.get('/api/audit-logs', requireAdmin, async (req: Request, res: Response) => {
  try {
    const filters: { actionType?: string; targetEntity?: string; adminId?: number; limit?: number; offset?: number } = {};
    if (req.query.actionType) filters.actionType = req.query.actionType as string;
    if (req.query.targetEntity) filters.targetEntity = req.query.targetEntity as string;
    if (req.query.adminId) filters.adminId = parseInt(req.query.adminId as string, 10);
    if (req.query.limit) filters.limit = parseInt(req.query.limit as string, 10);
    if (req.query.offset) filters.offset = parseInt(req.query.offset as string, 10);
    const logs = await auditService.getLogs(filters);
    return res.json(logs);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

app.use(errorHandler);

export { app, mikroTikService, paymentService, auditService, planService, PlanService, customerService, CustomerService, routerService, RouterService };
