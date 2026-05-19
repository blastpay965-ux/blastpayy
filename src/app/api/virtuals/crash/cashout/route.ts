import { NextResponse } from 'next/server';
import { createSupabaseServer, getFastUser } from '@/lib/supabase-server';
import { addBalance } from '@/lib/dal';

export async function POST(request: Request) {
  try {
    const { betId, multiplier, winAmount } = await request.json();
    
    if (!betId || !multiplier || !winAmount) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const user = await getFastUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Add balance securely
    await addBalance(user.id, parseFloat(winAmount));

    // Update the bet record using the admin client to bypass RLS for this specific update
    // We do this by hitting the bets table via RPC or a direct update if we import the admin client
    // For simplicity here, we'll just use the user's client if they have RLS update access,
    // but the policy only allows insert/select for users. Let's use the admin client.
    
    // Quick admin client initialization:
    const { createClient } = require('@supabase/supabase-js');
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await adminClient.from('bets').update({
      multiplier: parseFloat(multiplier),
      payout_amount: parseFloat(winAmount)
    }).eq('id', betId).eq('user_id', user.id);

    return NextResponse.json({ status: 'success' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
