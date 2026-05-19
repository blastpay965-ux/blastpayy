import { NextResponse } from 'next/server';
import { createSupabaseServer, getFastUser } from '@/lib/supabase-server';
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

    const user = await getFastUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [deducted, config] = await Promise.all([
      deductBalance(user.id, bet),
      getAdminConfig()
    ]);
    if (!deducted) return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });
    
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

    const serverSeed = crypto.randomBytes(32).toString('hex');
    const dbPromises: Promise<any>[] = [];
    
    if (isWin && winAmount > 0) {
      dbPromises.push(addBalance(user.id, winAmount));
    }
    
    dbPromises.push(
      createGameRound('limbo', serverSeed).then(round => 
        recordBet(user.id, 'limbo', bet, target, winAmount, round.id).then(() =>
          completeGameRound(round.id, user.id, JSON.stringify({ target, result: finalMult, winAmount }))
        )
      )
    );

    await Promise.all(dbPromises);

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
