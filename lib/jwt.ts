import jwt from 'jsonwebtoken';
import type { JwtPayload } from '@/types';

const getSecret = () =>
  process.env.JWT_SECRET ?? 'dev-secret-please-change-in-production';

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, getSecret(), { expiresIn: '24h' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret()) as JwtPayload;
}
