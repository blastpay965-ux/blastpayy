import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { getProfile } from '@/lib/dal';
import { getAdminConfig } from '@/lib/dal';
import { isRateLimited, rateLimitedResponse, getClientIp } from '@/lib/security';

export async function GET(request: Request) {
  const ip = getClientIp(request);
  if (isRateLimited(`auth-me:${ip}`, 60, 60_000)) return rateLimitedResponse();

  try {
    const supabase = await createSupabaseServer();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) return NextResponse.json({ user: null });

    const [profile, config] = await Promise.all([getProfile(user.id), getAdminConfig()]);
    if (!profile) return NextResponse.json({ user: null });

    if (config.bannedUsers.includes(profile.username)) {
      await supabase.auth.signOut();
      return NextResponse.json({ user: null, error: 'Suspended' }, { status: 403 });
    }

    return NextResponse.json({
      user: { username: profile.username, accountNumber: profile.accountNumber, isGuest: profile.isGuest },
    });
  } catch (err: any) {
    return NextResponse.json({ user: null, error: err.message }, { status: 500 });
  }
}
