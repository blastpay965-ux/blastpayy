import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { isRateLimited, rateLimitedResponse, getClientIp } from '@/lib/security';

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (isRateLimited(`logout:${ip}`, 20, 60_000)) return rateLimitedResponse();

  try {
    const supabase = await createSupabaseServer();
    await supabase.auth.signOut();
    return NextResponse.json({ status: 'success', message: 'Logged out successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
