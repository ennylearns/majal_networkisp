import { Pool, PoolClient } from 'pg';
import { NotFoundError, ValidationError } from '../errors';

export interface Customer {
  id: number;
  email: string | null;
  phone_number: string | null;
  created_at?: string | Date;
}

export interface CustomerTransaction {
  id: number;
  plan_name: string | null;
  amount: string | number;
  status: string;
  created_at: string | Date;
  paystack_reference: string;
}

export interface CustomerWithTransactions extends Customer {
  transactions: CustomerTransaction[];
}

export interface CreateCustomerDto {
  email: string;
  phone_number?: string | null;
}

export interface UpdateCustomerDto {
  email?: string;
  phone_number?: string | null;
}

export class CustomerService {
  constructor(private pool: Pool) {}

  private getDb(client?: Pool | PoolClient): Pool | PoolClient {
    return client || this.pool;
  }

  async findAll(client?: Pool | PoolClient): Promise<CustomerWithTransactions[]> {
    const db = this.getDb(client);
    const result = await db.query(`
      SELECT c.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', t.id,
                   'plan_name', p.name,
                   'amount', t.amount,
                   'status', t.status,
                   'created_at', t.created_at,
                   'paystack_reference', t.paystack_reference
                 ) ORDER BY t.created_at DESC
               ) FILTER (WHERE t.id IS NOT NULL), '[]'
             ) as transactions
      FROM customers c
      LEFT JOIN transactions t ON c.id = t.customer_id
      LEFT JOIN plans p ON t.plan_id = p.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    return result.rows;
  }

  async findById(id: number, client?: Pool | PoolClient): Promise<Customer | null> {
    const db = this.getDb(client);
    const result = await db.query('SELECT * FROM customers WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async getById(id: number, client?: Pool | PoolClient): Promise<CustomerWithTransactions> {
    const db = this.getDb(client);
    const result = await db.query(`
      SELECT c.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', t.id,
                   'plan_name', p.name,
                   'amount', t.amount,
                   'status', t.status,
                   'created_at', t.created_at,
                   'paystack_reference', t.paystack_reference
                 ) ORDER BY t.created_at DESC
               ) FILTER (WHERE t.id IS NOT NULL), '[]'
             ) as transactions
      FROM customers c
      LEFT JOIN transactions t ON c.id = t.customer_id
      LEFT JOIN plans p ON t.plan_id = p.id
      WHERE c.id = $1
      GROUP BY c.id
    `, [id]);
    if (result.rows.length === 0) {
      throw new NotFoundError('Customer not found');
    }
    return result.rows[0];
  }

  async findByEmail(email: string, client?: Pool | PoolClient): Promise<Customer | null> {
    const db = this.getDb(client);
    const result = await db.query('SELECT * FROM customers WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  async findByPhoneNumber(phoneNumber: string, client?: Pool | PoolClient): Promise<Customer | null> {
    const db = this.getDb(client);
    const result = await db.query('SELECT * FROM customers WHERE phone_number = $1', [phoneNumber]);
    return result.rows[0] || null;
  }

  async create(data: CreateCustomerDto, client?: Pool | PoolClient): Promise<Customer> {
    if (!data.email || typeof data.email !== 'string' || data.email.trim() === '') {
      throw new ValidationError('Customer email is required');
    }
    const db = this.getDb(client);
    const result = await db.query(
      'INSERT INTO customers (email, phone_number) VALUES ($1, $2) RETURNING *',
      [data.email.trim(), data.phone_number?.trim() || null]
    );
    return result.rows[0];
  }

  async findOrCreate(data: CreateCustomerDto, client?: Pool | PoolClient): Promise<Customer> {
    if (!data.email || typeof data.email !== 'string' || data.email.trim() === '') {
      throw new ValidationError('Customer email is required');
    }
    const existing = await this.findByEmail(data.email.trim(), client);
    if (existing) {
      return existing;
    }
    return this.create(data, client);
  }

  async update(id: number, data: UpdateCustomerDto, client?: Pool | PoolClient): Promise<Customer> {
    const existing = await this.findById(id, client);
    if (!existing) {
      throw new NotFoundError('Customer not found');
    }
    const email = data.email !== undefined ? data.email : existing.email;
    const phoneNumber = data.phone_number !== undefined ? data.phone_number : existing.phone_number;

    const db = this.getDb(client);
    const result = await db.query(
      'UPDATE customers SET email = $1, phone_number = $2 WHERE id = $3 RETURNING *',
      [email, phoneNumber, id]
    );
    return result.rows[0];
  }

  async delete(id: number, client?: Pool | PoolClient): Promise<Customer> {
    const db = this.getDb(client);
    const result = await db.query('DELETE FROM customers WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      throw new NotFoundError('Customer not found');
    }
    return result.rows[0];
  }
}
