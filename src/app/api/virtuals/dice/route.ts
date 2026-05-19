import { NextResponse } from 'next/server';
import { createSupabaseServer, getFastUser } from '@/lib/supabase-server';
import { getAdminConfig, clearGlobalRig, deductBalance, addBalance, createGameRound, recordBet, completeGameRound } from '@/lib/dal';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { betAmount, target, isRollOver } = await request.json();
    const bet = parseFloat(betAmount);
    
    if (isNaN(bet) || bet <= 0 || target < 2 || target > 98) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const user = await getFastUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [deducted, config] = await Promise.all([
      deductBalance(user.id, bet),
      getAdminConfig()
    ]);
    if (!deducted) return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });
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

    const serverSeed = crypto.randomBytes(32).toString('hex');
    const dbPromises: Promise<any>[] = [];
    
    if (isWin && winAmount > 0) {
      dbPromises.push(addBalance(user.id, winAmount));
    }
    
    dbPromises.push(
      createGameRound('dice', serverSeed).then(round => 
        recordBet(user.id, 'dice', bet, multiplier, winAmount, round.id).then(() =>
          completeGameRound(round.id, user.id, JSON.stringify({ target, isRollOver, roll: finalRoll, winAmount }))
        )
      )
    );

    await Promise.all(dbPromises);

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
