import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { deductBalance, addBalance, createGameRound, recordBet, completeGameRound, getAdminConfig, clearGlobalRig } from '@/lib/dal';
import crypto from 'crypto';

const PAYTABLE = [
  { hits: 0, mult: 0 },
  { hits: 1, mult: 0 },
  { hits: 2, mult: 1.5 },
  { hits: 3, mult: 5 },
  { hits: 4, mult: 15 },
  { hits: 5, mult: 50 }
];

export async function POST(request: Request) {
  try {
    const { betAmount, selectedNumbers } = await request.json();
    const bet = parseFloat(betAmount);

    if (isNaN(bet) || bet <= 0 || !Array.isArray(selectedNumbers) || selectedNumbers.length !== 5) {
      return NextResponse.json({ error: 'Invalid parameters — need 5 selected numbers' }, { status: 400 });
    }

    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const deducted = await deductBalance(user.id, bet);
    if (!deducted) return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });

    const config = await getAdminConfig();
    let rig = config.globalRigOutcome;
    if (rig) await clearGlobalRig();

    // Draw 10 unique numbers from 1-40
    let drawnNumbers: number[] = [];
    
    if (rig === 'win') {
      // Force win: include all 5 selected numbers + 5 random
      drawnNumbers = [...selectedNumbers];
      while (drawnNumbers.length < 10) {
        const r = Math.floor(Math.random() * 40) + 1;
        if (!drawnNumbers.includes(r)) drawnNumbers.push(r);
      }
    } else if (rig === 'lose') {
      // Force lose: 0 hits
      while (drawnNumbers.length < 10) {
        const r = Math.floor(Math.random() * 40) + 1;
        if (!selectedNumbers.includes(r) && !drawnNumbers.includes(r)) drawnNumbers.push(r);
      }
    } else {
      // Fair draw
      while (drawnNumbers.length < 10) {
        const r = Math.floor(Math.random() * 40) + 1;
        if (!drawnNumbers.includes(r)) drawnNumbers.push(r);
      }
    }


    let hits = 0;
    for (const num of selectedNumbers) {
      if (drawnNumbers.includes(num)) hits++;
    }

    const mult = PAYTABLE.find(p => p.hits === hits)?.mult || 0;
    const winAmount = mult > 0 ? bet * mult : 0;

    if (winAmount > 0) await addBalance(user.id, winAmount);

    const serverSeed = crypto.randomBytes(32).toString('hex');
    const round = await createGameRound('keno', serverSeed);
    await recordBet(user.id, 'keno', bet, mult, winAmount, round.id);
    await completeGameRound(round.id, user.id, JSON.stringify({ drawnNumbers, selectedNumbers, hits, winAmount }));

    return NextResponse.json({ status: 'success', drawnNumbers, hits, mult, winAmount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
