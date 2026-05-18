/**
 * BlastPay — Central Security Utility Library
 * All API routes import from here for consistent, DRY security enforcement.
 */
import crypto from 'crypto';
import { NextResponse } from 'next/server';

// ─── Rate Limiter ─────────────────────────────────────────────────────────────
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const globalForRL = global as unknown as {
  rateLimitMap: Map<string, RateLimitEntry>;
};
if (!globalForRL.rateLimitMap) {
  globalForRL.rateLimitMap = new Map();
}
const rateLimitMap = globalForRL.rateLimitMap;

/**
 * Check rate limit for a given key (e.g. IP + route).
 * @param key       Unique key (IP + endpoint slug)
 * @param maxHits   Max requests allowed in window
 * @param windowMs  Time window in milliseconds
 * @returns true if the request should be BLOCKED
 */
export function isRateLimited(key: string, maxHits = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return false;
  }

  entry.count++;
  if (entry.count > maxHits) {
    return true; // blocked
  }
  return false;
}

/**
 * Returns a 429 Too Many Requests response.
 */
export function rateLimitedResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please wait and try again.' },
    {
      status: 429,
      headers: { 'Retry-After': '60' },
    }
  );
}

// ─── IP Extraction ─────────────────────────────────────────────────────────────
/**
 * Extract client IP from request headers (works behind proxies/Vercel).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}

// ─── Admin IP Whitelisting ──────────────────────────────────────────────────
/**
 * Check if a client IP is allowed to access administrative routes.
 * Controlled by the `ALLOWED_ADMIN_IPS` environment variable (comma-separated list).
 */
export function isAdminIpWhitelisted(ip: string): boolean {
  const whitelistStr = process.env.ALLOWED_ADMIN_IPS || '';
  if (!whitelistStr) return true; // Disabled unless configured
  
  const whitelist = whitelistStr.split(',').map(item => item.trim().toLowerCase());
  const normalizedIp = ip.trim().toLowerCase();
  
  return (
    whitelist.includes(normalizedIp) || 
    normalizedIp === '127.0.0.1' || 
    normalizedIp === '::1' || 
    normalizedIp === '::ffff:127.0.0.1'||
    normalizedIp === 'http://localhost:3000'
  );
}

/**
 * Returns a 403 Forbidden response for blocked IPs.
 */
export function ipBlockedResponse(ip: string): NextResponse {
  return NextResponse.json(
    { 
      error: 'ACCESS FORBIDDEN: IP ADDRESS NOT AUTHORIZED', 
      message: `Your IP address [${ip}] is not authorized under active platform whitelist profiles.` 
    },
    { status: 403 }
  );
}

// ─── Body Size Guard ──────────────────────────────────────────────────────────
const MAX_BODY_BYTES = 10_240; // 10 KB

/**
 * Reject requests with an oversized Content-Length.
 * Returns a 413 response if too large, or null if OK.
 */
export function checkBodySize(request: Request): NextResponse | null {
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
  }
  return null;
}

// ─── Input Sanitizer ──────────────────────────────────────────────────────────
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Strip prototype-polluting keys from a parsed JSON object (deep).
 */
export function sanitizeInput<T extends object>(obj: T): T {
  if (typeof obj !== 'object' || obj === null) return obj;

  for (const key of Object.keys(obj)) {
    if (DANGEROUS_KEYS.has(key)) {
      delete (obj as any)[key];
    } else if (typeof (obj as any)[key] === 'object') {
      sanitizeInput((obj as any)[key]);
    }
  }
  return obj;
}

// ─── Timing-Safe String Comparison ────────────────────────────────────────────
/**
 * Compare two strings in constant time to prevent timing side-channel attacks.
 * Always returns false if lengths differ (fast path, no info leaked about content).
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  // Pad to equal length to avoid length leaks — then compare
  const bufA = Buffer.from(a.padEnd(128));
  const bufB = Buffer.from(b.padEnd(128));
  // Only safe if same length buffer
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB) && a.length === b.length;
}

// ─── Password Strength Validator ──────────────────────────────────────────────
/**
 * Enforce minimum password requirements.
 * Returns an error string, or null if password is strong enough.
 */
export function validatePassword(password: string): string | null {
  if (!password || typeof password !== 'string') return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[a-zA-Z]/.test(password)) return 'Password must contain at least one letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  return null; // valid
}

// ─── CORS Headers ────────────────────────────────────────────────────────────
/**
 * Add restrictive CORS headers to a response.
 * Allows only same-origin requests in production.
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  const origin = process.env.APP_ORIGIN || 'https://blastpay.com';
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-admin-pin');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  // Security hardening headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

// ─── Username Validator ───────────────────────────────────────────────────────
/**
 * Validate username — alphanumeric + underscore, 3–24 chars.
 */
export function validateUsername(username: string): string | null {
  if (!username || typeof username !== 'string') return 'Username is required';
  const trimmed = username.trim();
  if (trimmed.length < 3) return 'Username must be at least 3 characters';
  if (trimmed.length > 24) return 'Username must be 24 characters or fewer';
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) return 'Username may only contain letters, numbers, and underscores';
  return null;
}
