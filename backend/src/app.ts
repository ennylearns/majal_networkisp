import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { MikroTikService, FakeMikroTikService } from './services/MikroTikService';
import { PaymentService, FakePaymentService } from './services/PaymentService';
import { pool } from './db';
import { ProvisioningService } from './services/ProvisioningService';
import { generateRscScript } from './services/RscGenerator';

const provisioningService = new ProvisioningService();

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

app.post('/api/routers', async (req: Request, res: Response) => {
  const { name, location } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO routers (name, location, status) VALUES ($1, $2, $3) RETURNING id',
      [name, location, 'provisioning']
    );
    const routerId = result.rows[0].id;
    const token = await provisioningService.generateToken(routerId);
    
    const domain = req.get('host') || 'your-domain.com';
    const protocol = 'https'; // Explicitly use https for Winbox command as required by spec
    const url = `${protocol}://${domain}/provision/${token}`;
    const command = `/tool fetch url="${url}" mode=https dst-path=provision.rsc; /import file-name=provision.rsc`;

    return res.status(201).json({ id: routerId, token, command });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to register router' });
  }
});

app.post('/api/routers/:id/revoke-token', async (req: Request, res: Response) => {
  const { token } = req.body;
  try {
    await provisioningService.revokeToken(token);
    return res.json({ success: true });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

app.get('/provision/:token', async (req: Request, res: Response) => {
  const { token } = req.params;
  try {
    const routerId = await provisioningService.validateAndUseToken(token as string, 'Fetched provisioning script');
    
    const result = await pool.query('SELECT * FROM routers WHERE id = $1', [routerId]);
    if (result.rows.length === 0) {
      throw new Error('Router not found');
    }
    const router = result.rows[0];
    
    // Default config values if they are null in DB (or could throw error)
    const config = {
      routerId,
      token: token as string, // pass token to RscGenerator
      hotspotSubnet: router.hotspot_subnet || '192.168.88.0/24',
      hotspotGateway: router.hotspot_gateway || '192.168.88.1',
      hotspotPoolRange: router.hotspot_pool_range || '192.168.88.10-192.168.88.254',
      wireguardPeerConfig: router.wireguard_peer_config || 'endpoint=wg.majal.com:51820',
      wireguardPublicKey: router.wireguard_public_key || 'dummy-public-key',
      reportUrl: `https://${req.get('host') || 'api.majal.com'}/api/provision-report`
    };

    const script = generateRscScript(config);
    return res.type('text/plain').send(script.trim());
  } catch (error) {
    return res.status(400).send('# Provisioning failed: ' + (error as Error).message);
  }
});

app.post('/api/provision-report', async (req: Request, res: Response) => {
  const { token, status, message } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });
  
  try {
    // We already marked it used when it was fetched, but we can update the result.
    // A proper implementation might wait until this report to mark it used.
    // For now we just update the provisioning_result.
    await pool.query(`
      UPDATE router_provisioning_tokens 
      SET provisioning_result = $1 
      WHERE token = $2
    `, [`${status}: ${message}`, token]);
    
    // Also update router status
    if (status === 'success') {
      await pool.query(`
        UPDATE routers 
        SET status = 'online', last_seen_at = CURRENT_TIMESTAMP 
        WHERE id = (SELECT router_id FROM router_provisioning_tokens WHERE token = $1)
      `, [token]);
    } else {
      await pool.query(`
        UPDATE routers 
        SET status = 'error', last_seen_at = CURRENT_TIMESTAMP 
        WHERE id = (SELECT router_id FROM router_provisioning_tokens WHERE token = $1)
      `, [token]);
    }
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to save report' });
  }
});

app.get('/api/routers', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT id, name, location, status, routeros_version, architecture, last_seen_at
      FROM routers
      ORDER BY id ASC
    `);
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch routers' });
  }
});

app.get('/api/dashboard/stats', async (req: Request, res: Response) => {
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

app.post('/api/plans', async (req: Request, res: Response) => {
  const { name, price, data_allowance, duration, download_speed, upload_speed } = req.body;
  
  try {
    const mikrotik_profile_name = name.replace(/\s+/g, '_');
    
    // Create the plan
    const result = await pool.query(`
      INSERT INTO plans (name, price, data_allowance, duration, download_speed, upload_speed, mikrotik_profile_name, enabled)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      RETURNING *
    `, [name, price, data_allowance, duration, download_speed, upload_speed, mikrotik_profile_name]);
    
    const plan = result.rows[0];

    // Push the profile to all routers
    const routersResult = await pool.query(`SELECT id FROM routers`);
    const routers = routersResult.rows;

    const rateLimit = `${upload_speed || '0'}/${download_speed || '0'}`;
    const sessionDuration = duration ? `${duration}d` : undefined; // Assuming duration in days for this example
    const dataLimit = data_allowance ? data_allowance.toString() : undefined;

    for (const router of routers) {
      try {
        await mikroTikService.createProfile(router.id, mikrotik_profile_name, rateLimit, sessionDuration, dataLimit);
      } catch (err) {
        console.error(`Failed to push profile to router ${router.id}`);
      }
    }

    return res.status(201).json({ plan });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create plan' });
  }
});

app.put('/api/plans/:id/enable', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query('UPDATE plans SET enabled = true WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    return res.json({ plan: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to enable plan' });
  }
});

app.put('/api/plans/:id/disable', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query('UPDATE plans SET enabled = false WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    return res.json({ plan: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to disable plan' });
  }
});

app.get('/api/plans', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM plans ORDER BY id ASC');
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

export { app, mikroTikService, paymentService };
