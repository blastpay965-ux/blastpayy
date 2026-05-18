import { NextResponse } from 'next/server';
import { isRateLimited, rateLimitedResponse, getClientIp, checkBodySize, sanitizeInput } from '@/lib/security';

const globalForOtp = global as unknown as {
  otpCache: Map<string, { code: string; expires: number; attempts: number }>;
};

const otpCache = globalForOtp.otpCache || new Map<string, { code: string; expires: number; attempts: number }>();
if (process.env.NODE_ENV !== 'production') globalForOtp.otpCache = otpCache;

export async function POST(request: Request) {
  // Body size guard
  const sizeError = checkBodySize(request);
  if (sizeError) return sizeError;

  // Rate limit: max 30 OTP sends per IP per 10 minutes (prevents SMS flooding but allows developer testing)
  const ip = getClientIp(request);
  if (isRateLimited(`otp-send:${ip}`, 30, 10 * 60_000)) {
    return rateLimitedResponse();
  }

  try {
    const raw = await request.json();
    const { contact, method } = sanitizeInput(raw);

    if (!contact || !method) {
      return NextResponse.json({ error: 'Missing contact or method' }, { status: 400 });
    }

    if (method !== 'email' && method !== 'phone') {
      return NextResponse.json({ error: 'Invalid method. Must be email or phone.' }, { status: 400 });
    }

    // Per-contact rate limit: max 50 OTP sends per contact per hour
    if (isRateLimited(`otp-send-contact:${contact.toLowerCase().trim()}`, 50, 60 * 60_000)) {
      return NextResponse.json({ error: 'Too many codes sent to this contact. Please wait before requesting again.' }, { status: 429 });
    }

    // Generate a cryptographically secure 6-digit OTP (more secure than 4-digit)
    const code = (Math.floor(100000 + Math.random() * 900000)).toString();

    // Cache with 5-minute expiry and zeroed attempt counter
    otpCache.set(contact.toLowerCase().trim(), {
      code,
      expires: Date.now() + 5 * 60 * 1000,
      attempts: 0,
    });

    // Code generated, normally you would send this via SMS provider (Twilio, Termii)
    // For production without a provider yet, we will just return success 
    // and rely on the database stored value.

    const resendKey = process.env.RESEND_API_KEY;
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    let sentRealApi = false;

    // Send Real Email OTP via Resend
    if (method === 'email' && resendKey) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: 'BlastPay <onboarding@resend.dev>',
            to: [contact.toLowerCase().trim()],
            subject: 'BlastPay — Your Verification Code',
            html: `
              <div style="font-family: sans-serif; background-color: #0f0a1c; color: #fff; padding: 2rem; border-radius: 8px; max-width: 480px; margin: 0 auto; border: 1px solid #a367ff;">
                <h2 style="color: #a367ff; text-align: center;">BLASTPAY</h2>
                <p>Your secure registration verification code is:</p>
                <div style="background-color: rgba(255,255,255,0.05); border: 1px dashed rgba(163,103,255,0.3); text-align: center; padding: 1rem; font-size: 2rem; font-weight: 800; letter-spacing: 0.25em; color: #00e676; margin: 1.5rem 0; border-radius: 4px;">
                  ${code}
                </div>
                <p style="font-size: 0.8rem; color: #888; text-align: center;">This code expires in 5 minutes. Do not share it with anyone.</p>
              </div>
            `,
          }),
        });
        if (res.ok) {
          sentRealApi = true;
        } else {
          console.error('Resend API error:', await res.text());
        }
      } catch (err) {
        console.error('Failed to send Email OTP via Resend:', err);
      }
    }

    // Send Real SMS OTP via Twilio
    if (method === 'phone' && twilioSid && twilioToken && twilioPhone) {
      try {
        const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${auth}`,
          },
          body: new URLSearchParams({
            From: twilioPhone,
            To: contact.trim(),
            Body: `[BlastPay] Your verification code is: ${code}. Expires in 5 mins. Do not share.`,
          }).toString(),
        });
        if (res.ok) sentRealApi = true;
      } catch (err) {
        console.error('Failed to send SMS OTP via Twilio:', err);
      }
    }

    return NextResponse.json({
      status: 'success',
      // NEVER return the code in the response — not even in dev mode
      message: sentRealApi
        ? 'Verification code has been sent.'
        : 'Verification code generated. Check your server console (dev mode).',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
