import { NextResponse } from 'next/server';
import { createSupabaseServer, getFastUser } from '@/lib/supabase-server';
import { deductBalance, recordBet } from '@/lib/dal';

export async function POST(request: Request) {
  try {
    const { betAmount, roundId } = await request.json();
    const bet = parseFloat(betAmount);
    
    if (isNaN(bet) || bet <= 0 || !roundId) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const user = await getFastUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deducted = await deductBalance(user.id, bet);
    if (!deducted) {
      return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });
    }

    const betRecord = await recordBet(user.id, 'crash', bet, null, 0, roundId);

    return NextResponse.json({ status: 'success', betId: betRecord.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
