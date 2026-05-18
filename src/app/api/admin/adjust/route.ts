import { NextResponse } from 'next/server';
import { getAdminClient, depositBalance, deductBalance } from '@/lib/dal';
import { isRateLimited, rateLimitedResponse, getClientIp, checkBodySize, sanitizeInput, timingSafeEqual, isAdminIpWhitelisted, ipBlockedResponse } from '@/lib/security';

function verifyAdminAuth(request: Request): boolean {
  const pin = request.headers.get('x-admin-pin') ?? '';
  const securePin = process.env.ADMIN_PIN;
  if (!securePin) return false;
  return timingSafeEqual(pin, securePin);
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!isAdminIpWhitelisted(ip)) return ipBlockedResponse(ip);
  if (isRateLimited(`admin-adjust-post:${ip}`, 30, 60_000)) return rateLimitedResponse();
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized: Invalid access credentials' }, { status: 401 });
  }

  const sizeError = checkBodySize(request);
  if (sizeError) return sizeError;

  try {
    const raw = await request.json();
    const { username, amount, action } = sanitizeInput(raw);

    if (!username || typeof amount !== 'number' || amount <= 0 || !['credit', 'drain'].includes(action)) {
      return NextResponse.json({ error: 'Invalid payload parameters' }, { status: 400 });
    }

    const supabase = getAdminClient();
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, balance')
      .eq('username', username)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'Target player profile not found' }, { status: 404 });
    }

    let newBalance: number | null = null;
    if (action === 'credit') {
      newBalance = await depositBalance(profile.id, amount);
    } else {
      if (amount > parseFloat(profile.balance)) {
        return NextResponse.json({ error: 'Deduction exceeds player available balance' }, { status: 400 });
      }
      newBalance = await deductBalance(profile.id, amount);
    }

    if (newBalance === null) {
      return NextResponse.json({ error: 'Balance mutation execution failed' }, { status: 500 });
    }

    return NextResponse.json({ status: 'success', balance: newBalance });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
