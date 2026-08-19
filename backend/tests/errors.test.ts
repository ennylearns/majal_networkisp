import { describe, it, expect, vi } from 'vitest';
import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import {
  DomainError,
  NotFoundError,
  ValidationError,
  ConflictError,
  UnauthorizedError,
  BadGatewayError
} from '../src/errors';
import { errorHandler } from '../src/middleware/errorHandler';

describe('Domain Error Hierarchy', () => {
  it('should instantiate base DomainError with default status code 500 or custom status code', () => {
    const err = new DomainError('Something failed', 500);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(DomainError);
    expect(err.name).toBe('DomainError');
    expect(err.message).toBe('Something failed');
    expect(err.statusCode).toBe(500);
  });

  it('should instantiate ValidationError with status 400', () => {
    const err = new ValidationError('Invalid plan name');
    expect(err).toBeInstanceOf(DomainError);
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.name).toBe('ValidationError');
    expect(err.message).toBe('Invalid plan name');
    expect(err.statusCode).toBe(400);
  });

  it('should instantiate UnauthorizedError with status 401', () => {
    const err = new UnauthorizedError('Authentication required');
    expect(err).toBeInstanceOf(DomainError);
    expect(err).toBeInstanceOf(UnauthorizedError);
    expect(err.name).toBe('UnauthorizedError');
    expect(err.message).toBe('Authentication required');
    expect(err.statusCode).toBe(401);
  });

  it('should instantiate NotFoundError with status 404', () => {
    const err = new NotFoundError('Router not found');
    expect(err).toBeInstanceOf(DomainError);
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err.name).toBe('NotFoundError');
    expect(err.message).toBe('Router not found');
    expect(err.statusCode).toBe(404);
  });

  it('should instantiate ConflictError with status 409', () => {
    const err = new ConflictError('Plan name already exists');
    expect(err).toBeInstanceOf(DomainError);
    expect(err).toBeInstanceOf(ConflictError);
    expect(err.name).toBe('ConflictError');
    expect(err.message).toBe('Plan name already exists');
    expect(err.statusCode).toBe(409);
  });

  it('should instantiate BadGatewayError with status 502', () => {
    const err = new BadGatewayError('MikroTik router unreachable');
    expect(err).toBeInstanceOf(DomainError);
    expect(err).toBeInstanceOf(BadGatewayError);
    expect(err.name).toBe('BadGatewayError');
    expect(err.message).toBe('MikroTik router unreachable');
    expect(err.statusCode).toBe(502);
  });
});

describe('Central Express Error Middleware', () => {
  function createTestApp() {
    const app = express();
    app.use(express.json());

    app.get('/test/validation-error', () => {
      throw new ValidationError('Validation failed for field: price');
    });

    app.get('/test/unauthorized-error', () => {
      throw new UnauthorizedError('Unauthorized access');
    });

    app.get('/test/not-found-error', () => {
      throw new NotFoundError('Customer not found');
    });

    app.get('/test/conflict-error', () => {
      throw new ConflictError('Customer email already registered');
    });

    app.get('/test/bad-gateway-error', () => {
      throw new BadGatewayError('Upstream payment gateway timeout');
    });

    app.get('/test/unhandled-error', () => {
      throw new Error('Database connection crashed');
    });

    app.use(errorHandler);
    return app;
  }

  const app = createTestApp();

  it('should translate ValidationError to 400 and uniform JSON error body', async () => {
    const res = await request(app).get('/test/validation-error');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Validation failed for field: price' });
  });

  it('should translate UnauthorizedError to 401 and uniform JSON error body', async () => {
    const res = await request(app).get('/test/unauthorized-error');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized access' });
  });

  it('should translate NotFoundError to 404 and uniform JSON error body', async () => {
    const res = await request(app).get('/test/not-found-error');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Customer not found' });
  });

  it('should translate ConflictError to 409 and uniform JSON error body', async () => {
    const res = await request(app).get('/test/conflict-error');
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'Customer email already registered' });
  });

  it('should translate BadGatewayError to 502 and uniform JSON error body', async () => {
    const res = await request(app).get('/test/bad-gateway-error');
    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: 'Upstream payment gateway timeout' });
  });

  it('should translate unhandled internal Error to 500 and log', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(app).get('/test/unhandled-error');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
