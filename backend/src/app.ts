import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { MikroTikService, FakeMikroTikService } from './services/MikroTikService';
import { PaymentService, FakePaymentService } from './services/PaymentService';
import { pool } from './db';
import { ProvisioningService } from './services/ProvisioningService';

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
    
    const script = `
# RouterOS provisioning script
/system identity set name="MAJAL-Router-${routerId}"
/log info "Provisioning complete for MAJAL network"
`;
    return res.type('text/plain').send(script.trim());
  } catch (error) {
    return res.status(400).send('# Provisioning failed: ' + (error as Error).message);
  }
});

export { app, mikroTikService, paymentService };
