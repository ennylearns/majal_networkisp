import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function getAdminId(req: Request): number | null {
  const authHeader = req.headers.authorization as string | undefined;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.split(' ')[1];
    if (!token) return null;
    const payload = jwt.verify(token, 'secret-key') as any;
    return payload.id || null;
  } catch (e) {
    return null;
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!getAdminId(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
