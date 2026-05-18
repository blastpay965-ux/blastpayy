import { NextResponse } from 'next/server';
import { isRateLimited, rateLimitedResponse, getClientIp, checkBodySize, sanitizeInput } from '@/lib/security';

const globalForOtp = global as unknown as {
  otpCache: Map<string, { code: string; expires: number; attempts: number }>;
};

const otpCache = globalForOtp.otpCache || new Map<string, { code: string; expires: number; attempts: number }>();
if (process.env.NODE_ENV !== 'production') globalForOtp.otpCache = otpCache;

const MAX_OTP_ATTEMPTS = 5;

export async function POST(request: Request) {
  // Body size guard
  const sizeError = checkBodySize(request);
  if (sizeError) return sizeError;

  // Rate limit: max 10 verify attempts per IP per minute
  const ip = getClientIp(request);
  if (isRateLimited(`otp-verify:${ip}`, 10, 60_000)) {
    return rateLimitedResponse();
  }

  try {
    const raw = await request.json();
    const { contact, code } = sanitizeInput(raw);

    if (!contact || !code) {
      return NextResponse.json({ error: 'Missing contact or code' }, { status: 400 });
    }

    const key = contact.toLowerCase().trim();
    const record = otpCache.get(key);

    if (!record) {
      return NextResponse.json({ error: 'Verification code not found or has expired. Please request a new one.' }, { status: 400 });
    }

    if (Date.now() > record.expires) {
      otpCache.delete(key);
      return NextResponse.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
    }

    // ── Brute-force lockout ────────────────────────────────────────────
    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      otpCache.delete(key); // Invalidate to force a fresh OTP send
      return NextResponse.json(
        { error: 'Too many failed attempts. Please request a new verification code.' },
        { status: 429 }
      );
    }

    if (record.code !== code.trim()) {
      record.attempts++;
      const remaining = MAX_OTP_ATTEMPTS - record.attempts;
      return NextResponse.json(
        { error: `Invalid verification code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` },
        { status: 400 }
      );
    }

    // ── Success — consume the OTP ─────────────────────────────────────
    otpCache.delete(key);

    return NextResponse.json({
      status: 'success',
      message: 'OTP verified successfully.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
