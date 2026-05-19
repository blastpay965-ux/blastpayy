import { NextResponse } from 'next/server';
import { createSupabaseServer, getFastUser } from '@/lib/supabase-server';
import { getProfile, getTransactions } from '@/lib/dal';
import { getAdminConfig } from '@/lib/dal';
import { isRateLimited, rateLimitedResponse, getClientIp } from '@/lib/security';

export async function GET(request: Request) {
  const ip = getClientIp(request);
  if (isRateLimited(`wallet-sync:${ip}`, 60, 60_000)) return rateLimitedResponse();

  try {
    const user = await getFastUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [profile, txns, config] = await Promise.all([
      getProfile(user.id),
      getTransactions(user.id),
      getAdminConfig(),
    ]);
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const isBanned = config.bannedUsers.includes(profile.username);

    return NextResponse.json({
      status: 'success',
      balance: profile.balance,
      transactions: txns,
      isFrozen: config.frozenUsers.includes(profile.username),
      isBanned: isBanned,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
