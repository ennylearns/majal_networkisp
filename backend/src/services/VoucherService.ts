import crypto from 'crypto';
import { pool } from '../db';
import { mikroTikService } from '../app';

export class VoucherService {
  private charset = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

  private generateRandomCode(): string {
    let code = '';
    for (let i = 0; i < 6; i++) {
      const randomIndex = crypto.randomInt(0, this.charset.length);
      code += this.charset[randomIndex];
    }
    return code;
  }

  public hashVoucher(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  private async generateUniqueCode(): Promise<{ code: string; hash: string }> {
    let isUnique = false;
    let code = '';
    let hash = '';
    
    // retry until we find a unique hash
    while (!isUnique) {
      code = this.generateRandomCode();
      hash = this.hashVoucher(code);
      
      const result = await pool.query('SELECT id FROM vouchers WHERE code_hash = $1', [hash]);
      if (result.rows.length === 0) {
        isUnique = true;
      }
    }
    
    return { code, hash };
  }

  public async issueVoucherForTransaction(reference: string): Promise<string> {
    const txResult = await pool.query(`
      SELECT t.*, c.email, c.phone_number, p.mikrotik_profile_name 
      FROM transactions t
      JOIN customers c ON t.customer_id = c.id
      JOIN plans p ON t.plan_id = p.id
      WHERE t.paystack_reference = $1
    `, [reference]);

    if (txResult.rows.length === 0) {
      throw new Error('Transaction not found');
    }

    const tx = txResult.rows[0];

    if (tx.status !== 'successful') {
      throw new Error('Transaction is not successful');
    }

    const existingVoucherResult = await pool.query('SELECT id FROM vouchers WHERE transaction_id = $1', [tx.id]);
    if (existingVoucherResult.rows.length > 0) {
      throw new Error('Voucher already issued for this transaction');
    }

    const { code, hash } = await this.generateUniqueCode();

    const routerId = tx.router_id;
    const routerResult = await pool.query('SELECT status FROM routers WHERE id = $1', [routerId]);
    const isOnline = routerResult.rows.length > 0 && routerResult.rows[0].status === 'online';

    const insertResult = await pool.query(`
      INSERT INTO vouchers (code_hash, plan_id, transaction_id, phone_number, email, status, activation_status, router_id)
      VALUES ($1, $2, $3, $4, $5, 'unused', 'PENDING', $6)
      RETURNING id
    `, [hash, tx.plan_id, tx.id, tx.phone_number, tx.email, routerId]);

    const voucherId = insertResult.rows[0].id;

    // Start activation asynchronously
    if (isOnline) {
      this.activateVoucher(voucherId, routerId, code, tx.mikrotik_profile_name).catch(err => {
        console.error('Failed to activate voucher:', err);
      });
    } else {
      await pool.query(`UPDATE vouchers SET activation_status = 'FAILED' WHERE id = $1`, [voucherId]);
    }

    return code;
  }

  public async activateVoucher(voucherId: number, routerId: number, code: string, profile: string) {
    let success = false;
    let attempts = 0;
    const maxAttempts = 5;

    while (!success && attempts < maxAttempts) {
      try {
        attempts++;
        await mikroTikService.createUser(routerId, code, profile);
        success = true;
      } catch (error) {
        console.error(`Activation attempt ${attempts} failed for voucher ${voucherId}:`, error);
        if (attempts < maxAttempts) {
          // simple backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }
    }

    const status = success ? 'ACTIVATED' : 'FAILED';
    await pool.query(`UPDATE vouchers SET activation_status = $1 WHERE id = $2`, [status, voucherId]);
  }

  public async verifyVoucher(code: string): Promise<boolean> {
    const hash = this.hashVoucher(code);
    const result = await pool.query('SELECT id FROM vouchers WHERE code_hash = $1', [hash]);
    return result.rows.length > 0;
  }
}

export const voucherService = new VoucherService();
