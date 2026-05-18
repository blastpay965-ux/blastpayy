import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { deductBalance, addBalance, createGameRound, recordBet, completeGameRound, getAdminConfig, clearGlobalRig } from '@/lib/dal';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { betAmount, targetMultiplier } = await request.json();
    const bet = parseFloat(betAmount);
    const target = parseFloat(targetMultiplier);
    
    if (isNaN(bet) || bet <= 0 || isNaN(target) || target < 1.01) {
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

    const e = 2 ** 32;
    const h = crypto.randomBytes(4).readUInt32LE(0);
    let finalMult = Math.max(1, (100 * e - h) / (e - h) / 100) * 0.99; // 1% house edge
    
    if (rig === 'win') {
      // Force win: Generate a multiplier higher than target
      finalMult = target + Math.random() * 5;
    } else if (rig === 'lose') {
      // Force lose: Generate a multiplier lower than target
      finalMult = Math.max(1.00, target - 0.01 - Math.random());
    }

    // Ensure rounding
    finalMult = parseFloat(finalMult.toFixed(2));

    const isWin = finalMult >= target;
    const winAmount = isWin ? bet * target : 0;

    if (isWin && winAmount > 0) {
      await addBalance(user.id, winAmount);
    }

    // Secure audit logging
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const round = await createGameRound('limbo', serverSeed);
    await recordBet(user.id, 'limbo', bet, target, winAmount, round.id);
    await completeGameRound(round.id, user.id, JSON.stringify({ target, result: finalMult, winAmount }));

    return NextResponse.json({
      status: 'success',
      resultMult: finalMult,
      isWin,
      winAmount
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
