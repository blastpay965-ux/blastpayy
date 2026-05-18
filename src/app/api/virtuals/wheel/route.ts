import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { getAdminConfig, clearGlobalRig, deductBalance, addBalance, createGameRound, recordBet, completeGameRound } from '@/lib/dal';
import crypto from 'crypto';

const SEGMENTS = [
  { mult: 0.00, color: '#ff4444' },
  { mult: 1.20, color: '#3b4150' },
  { mult: 1.50, color: '#a367ff' },
  { mult: 0.00, color: '#ff4444' },
  { mult: 2.00, color: '#00e676' },
  { mult: 1.20, color: '#3b4150' },
  { mult: 3.00, color: '#fdd835' },
  { mult: 0.00, color: '#ff4444' }
];

export async function POST(request: Request) {
  try {
    const { betAmount } = await request.json();
    const bet = parseFloat(betAmount);
    
    if (isNaN(bet) || bet <= 0) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const deducted = await deductBalance(user.id, bet);
    if (!deducted) return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });

    const config = await getAdminConfig();
    
    // Rigging Override check
    let rig = config.globalRigOutcome;
    if (rig) await clearGlobalRig();

    let winningIndex = Math.floor(Math.random() * SEGMENTS.length);
    
    if (rig === 'win') {
      winningIndex = Math.random() > 0.5 ? 6 : 4; // 3.00x or 2.00x
    } else if (rig === 'lose') {
      winningIndex = [0, 3, 7][Math.floor(Math.random() * 3)]; // 0.00x
    }

    const mult = SEGMENTS[winningIndex].mult;
    const isWin = mult > 0;
    const winAmount = isWin ? bet * mult : 0;

    if (isWin && winAmount > 0) {
      await addBalance(user.id, winAmount);
    }

    // Secure audit logging
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const round = await createGameRound('wheel', serverSeed);
    await recordBet(user.id, 'wheel', bet, mult, winAmount, round.id);
    await completeGameRound(round.id, user.id, JSON.stringify({ winningIndex, mult, winAmount }));

    return NextResponse.json({
      status: 'success',
      winningIndex,
      mult,
      isWin,
      winAmount
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
