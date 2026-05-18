import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { getAdminConfig, clearGlobalRig, deductBalance, addBalance, createGameRound, recordBet, completeGameRound } from '@/lib/dal';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { betAmount, target, isRollOver } = await request.json();
    const bet = parseFloat(betAmount);
    
    if (isNaN(bet) || bet <= 0 || target < 2 || target > 98) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const deducted = await deductBalance(user.id, bet);
    if (!deducted) return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });

    const config = await getAdminConfig();
    const winChance = isRollOver ? 100 - target : target;
    const multiplier = 99 / winChance; // 1% house edge

    // Rigging Override check
    let rig = config.globalRigOutcome;
    if (rig) await clearGlobalRig();

    let finalRoll = parseFloat((Math.random() * 100).toFixed(2));
    
    if (rig === 'win') {
      if (isRollOver) {
        finalRoll = parseFloat((target + Math.random() * (100 - target)).toFixed(2));
        if (finalRoll <= target) finalRoll = Math.min(100, target + 1);
      } else {
        finalRoll = parseFloat((Math.random() * target).toFixed(2));
        if (finalRoll >= target) finalRoll = Math.max(0, target - 1);
      }
    } else if (rig === 'lose') {
      if (isRollOver) {
        finalRoll = parseFloat((Math.random() * target).toFixed(2));
        if (finalRoll >= target) finalRoll = Math.max(0, target - 1);
      } else {
        finalRoll = parseFloat((target + Math.random() * (100 - target)).toFixed(2));
        if (finalRoll <= target) finalRoll = Math.min(100, target + 1);
      }
    }

    const isWin = isRollOver ? finalRoll > target : finalRoll < target;
    const winAmount = isWin ? bet * multiplier : 0;

    if (isWin && winAmount > 0) {
      await addBalance(user.id, winAmount);
    }

    // Secure audit logging
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const round = await createGameRound('dice', serverSeed);
    await recordBet(user.id, 'dice', bet, multiplier, winAmount, round.id);
    await completeGameRound(round.id, user.id, JSON.stringify({ target, isRollOver, roll: finalRoll, winAmount }));

    return NextResponse.json({
      status: 'success',
      rollResult: finalRoll,
      isWin,
      winAmount
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
