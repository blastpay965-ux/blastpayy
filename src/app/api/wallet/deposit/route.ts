import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { getProfile, depositBalance, getTransactions } from '@/lib/dal';
import { getAdminConfig } from '@/lib/dal';
import { isRateLimited, rateLimitedResponse, getClientIp, checkBodySize, sanitizeInput } from '@/lib/security';

const MIN_DEPOSIT = 50;
const MAX_DEPOSIT = 1_000_000;

export async function POST(request: Request) {
  const sizeError = checkBodySize(request);
  if (sizeError) return sizeError;

  const ip = getClientIp(request);
  if (isRateLimited(`deposit:${ip}`, 20, 60_000)) return rateLimitedResponse();

  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [profile, config] = await Promise.all([getProfile(user.id), getAdminConfig()]);
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (config.bannedUsers.includes(profile.username)) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: 'Access Denied: Account suspended' }, { status: 403 });
    }
    if (config.frozenUsers.includes(profile.username)) {
      return NextResponse.json({ error: 'Access Denied: Wallet is locked/frozen' }, { status: 403 });
    }

    const raw = await request.json();
    const { amount } = sanitizeInput(raw);
    const val = parseFloat(amount);

    if (isNaN(val) || val < MIN_DEPOSIT) {
      return NextResponse.json({ error: `Minimum deposit is ₦${MIN_DEPOSIT.toLocaleString()}` }, { status: 400 });
    }
    if (val > MAX_DEPOSIT) {
      return NextResponse.json({ error: `Maximum deposit is ₦${MAX_DEPOSIT.toLocaleString()}` }, { status: 400 });
    }

    const newBalance = await depositBalance(user.id, val);
    if (newBalance === null) return NextResponse.json({ error: 'Deposit failed' }, { status: 500 });

    const txns = await getTransactions(user.id);
    return NextResponse.json({ status: 'success', balance: newBalance, transactions: txns });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
