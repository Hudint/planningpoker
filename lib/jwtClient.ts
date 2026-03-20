import type { JwtPayload } from '@/types';

/** Decodes a JWT payload without verification – safe to use in the browser. */
export function decodeToken(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    // Basic expiry check
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload as JwtPayload;
  } catch {
    return null;
  }
}
