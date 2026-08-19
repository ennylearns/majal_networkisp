import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Pool } from 'pg';
import { CustomerService } from '../src/services/CustomerService';
import { NotFoundError, ValidationError } from '../src/errors';

describe('CustomerService Unit Tests', () => {
  let mockPool: any;
  let customerService: CustomerService;

  beforeEach(() => {
    mockPool = {
      query: vi.fn(),
    };
    customerService = new CustomerService(mockPool as unknown as Pool);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findAll', () => {
    it('returns all customers with transactions', async () => {
      const customers = [
        {
          id: 1,
          email: 'user1@example.com',
          phone_number: '1234567890',
          created_at: new Date(),
          transactions: [
            {
              id: 101,
              plan_name: 'Basic Plan',
              amount: '5000',
              status: 'successful',
              created_at: new Date(),
              paystack_reference: 'ref-101',
            },
          ],
        },
      ];
      mockPool.query.mockResolvedValueOnce({ rows: customers });

      const result = await customerService.findAll();
      expect(mockPool.query).toHaveBeenCalled();
      expect(result).toEqual(customers);
    });

    it('uses provided client seam when passed', async () => {
      const mockClient = { query: vi.fn().mockResolvedValueOnce({ rows: [] }) };
      await customerService.findAll(mockClient as any);
      expect(mockClient.query).toHaveBeenCalled();
      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });

  describe('findById and getById', () => {
    it('returns customer when found by id', async () => {
      const customer = { id: 1, email: 'user1@example.com', phone_number: '123' };
      mockPool.query.mockResolvedValueOnce({ rows: [customer] });

      const result = await customerService.findById(1);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM customers WHERE id = $1', [1]);
      expect(result).toEqual(customer);
    });

    it('returns null when customer not found by findById', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await customerService.findById(999);
      expect(result).toBeNull();
    });

    it('returns customer with transactions when getById is called', async () => {
      const customerWithTx = {
        id: 1,
        email: 'user1@example.com',
        phone_number: '123',
        transactions: [],
      };
      mockPool.query.mockResolvedValueOnce({ rows: [customerWithTx] });

      const result = await customerService.getById(1);
      expect(result).toEqual(customerWithTx);
    });

    it('throws NotFoundError when getById does not find customer', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(customerService.getById(999)).rejects.toThrow(NotFoundError);
      await expect(customerService.getById(999)).rejects.toThrow('Customer not found');
    });
  });

  describe('findByEmail and findByPhoneNumber', () => {
    it('returns customer when found by email', async () => {
      const customer = { id: 1, email: 'user@example.com', phone_number: '123' };
      mockPool.query.mockResolvedValueOnce({ rows: [customer] });

      const result = await customerService.findByEmail('user@example.com');
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM customers WHERE email = $1', ['user@example.com']);
      expect(result).toEqual(customer);
    });

    it('returns null when not found by email', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await customerService.findByEmail('notfound@example.com');
      expect(result).toBeNull();
    });

    it('returns customer when found by phone number', async () => {
      const customer = { id: 1, email: 'user@example.com', phone_number: '123456' };
      mockPool.query.mockResolvedValueOnce({ rows: [customer] });

      const result = await customerService.findByPhoneNumber('123456');
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM customers WHERE phone_number = $1', ['123456']);
      expect(result).toEqual(customer);
    });
  });

  describe('create', () => {
    it('creates and returns a new customer', async () => {
      const newCustomer = { id: 1, email: 'test@example.com', phone_number: '1234567890' };
      mockPool.query.mockResolvedValueOnce({ rows: [newCustomer] });

      const result = await customerService.create({
        email: 'test@example.com',
        phone_number: '1234567890',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        'INSERT INTO customers (email, phone_number) VALUES ($1, $2) RETURNING *',
        ['test@example.com', '1234567890']
      );
      expect(result).toEqual(newCustomer);
    });

    it('throws ValidationError if email is missing or empty', async () => {
      await expect(customerService.create({ email: '' })).rejects.toThrow(ValidationError);
      await expect(customerService.create({ email: '   ' })).rejects.toThrow('Customer email is required');
      await expect(customerService.create({ email: null as any })).rejects.toThrow(ValidationError);
    });

    it('uses provided transaction client seam', async () => {
      const mockClient = { query: vi.fn().mockResolvedValueOnce({ rows: [{ id: 2, email: 'tx@example.com' }] }) };
      const result = await customerService.create({ email: 'tx@example.com' }, mockClient as any);
      expect(mockClient.query).toHaveBeenCalled();
      expect(mockPool.query).not.toHaveBeenCalled();
      expect(result.id).toBe(2);
    });
  });

  describe('findOrCreate', () => {
    it('returns existing customer if found by email', async () => {
      const existing = { id: 1, email: 'existing@example.com', phone_number: '111' };
      mockPool.query.mockResolvedValueOnce({ rows: [existing] });

      const result = await customerService.findOrCreate({ email: 'existing@example.com', phone_number: '222' });
      expect(result).toEqual(existing);
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('creates new customer if not found by email', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // findByEmail
        .mockResolvedValueOnce({ rows: [{ id: 5, email: 'new@example.com', phone_number: '555' }] }); // create

      const result = await customerService.findOrCreate({ email: 'new@example.com', phone_number: '555' });
      expect(result.id).toBe(5);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('update and delete', () => {
    it('updates customer fields', async () => {
      const existing = { id: 1, email: 'old@example.com', phone_number: '111' };
      const updated = { id: 1, email: 'new@example.com', phone_number: '222' };

      mockPool.query
        .mockResolvedValueOnce({ rows: [existing] }) // findById
        .mockResolvedValueOnce({ rows: [updated] }); // update

      const result = await customerService.update(1, { email: 'new@example.com', phone_number: '222' });
      expect(result).toEqual(updated);
    });

    it('throws NotFoundError when updating non-existent customer', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // findById

      await expect(customerService.update(999, { email: 'test@example.com' })).rejects.toThrow(NotFoundError);
    });

    it('deletes customer', async () => {
      const deleted = { id: 1, email: 'del@example.com', phone_number: '111' };
      mockPool.query.mockResolvedValueOnce({ rows: [deleted] });

      const result = await customerService.delete(1);
      expect(result).toEqual(deleted);
    });

    it('throws NotFoundError when deleting non-existent customer', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(customerService.delete(999)).rejects.toThrow(NotFoundError);
    });
  });
});
