import { NextResponse } from 'next/server';
import { getFastUser } from '@/lib/supabase-server';
import { getAdminConfig, clearGlobalRig, deductBalance, addBalance, createGameRound, recordBet, completeGameRound } from '@/lib/dal';
import crypto from 'crypto';

const SYMBOLS = [
  { char: '🍒', payout: 5 },
  { char: '🍋', payout: 10 },
  { char: '🔔', payout: 20 },
  { char: '💎', payout: 50 },
  { char: '7️⃣', payout: 100 }
];

export async function POST(request: Request) {
  try {
    const { betAmount } = await request.json();
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet <= 0) return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });

    const user = await getFastUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [deducted, config] = await Promise.all([
      deductBalance(user.id, bet),
      getAdminConfig()
    ]);
    if (!deducted) return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });

    // Rig override — consumed once then cleared
    const rig = config.globalRigOutcome;
    if (rig) await clearGlobalRig();

    let reels: string[];

    if (rig === 'win') {
      // Force a jackpot — random matching symbol
      const winSymbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].char;
      reels = [winSymbol, winSymbol, winSymbol];
    } else if (rig === 'lose') {
      // Force a guaranteed loss — three unique different symbols
      reels = ['🍒', '🍋', '🔔'];
    } else {
      // Standard spin — 20% win rate
      reels = [
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].char,
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].char,
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].char,
      ];
      if (Math.random() > 0.8) {
        const winSymbol = SYMBOLS[Math.floor(Math.random() * 3)].char;
        reels = [winSymbol, winSymbol, winSymbol];
      }
    }

    let isWin = false;
    let payoutMult = 0;
    let winAmount = 0;

    if (reels[0] === reels[1] && reels[1] === reels[2]) {
      const symbolData = SYMBOLS.find(s => s.char === reels[0]);
      if (symbolData) {
        payoutMult = symbolData.payout;
        winAmount = bet * payoutMult;
        isWin = true;
      }
    }

    const serverSeed = crypto.randomBytes(32).toString('hex');
    const dbPromises: Promise<any>[] = [];

    if (isWin && winAmount > 0) {
      dbPromises.push(addBalance(user.id, winAmount));
    }

    dbPromises.push(
      createGameRound('slots', serverSeed).then(round =>
        recordBet(user.id, 'slots', bet, payoutMult || 0, winAmount, round.id).then(() =>
          completeGameRound(round.id, user.id, JSON.stringify({ reels, isWin, winAmount }))
        )
      )
    );

    await Promise.all(dbPromises);

    return NextResponse.json({ status: 'success', reels, isWin, payoutMult, winAmount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
