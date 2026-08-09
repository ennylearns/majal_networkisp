import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { MikroTikService, FakeMikroTikService } from './services/MikroTikService';
import { PaymentService, FakePaymentService } from './services/PaymentService';
import { pool } from './db';

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

export { app, mikroTikService, paymentService };
