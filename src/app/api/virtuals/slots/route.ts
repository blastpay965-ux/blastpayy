import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
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

    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const deducted = await deductBalance(user.id, bet);
    if (!deducted) return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });

    const config = await getAdminConfig();
    let rig = config.globalRigOutcome;
    if (rig) await clearGlobalRig();

    let reels = [
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].char,
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].char,
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].char
    ];

    if (rig === 'win') {
      const winSymbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].char;
      reels = [winSymbol, winSymbol, winSymbol];
    } else if (rig === 'lose') {
      reels = ['🍒', '🍋', '🔔'];
    } else {
      // Standard 20% win rate
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
        await addBalance(user.id, winAmount);
      }
    }

    const serverSeed = crypto.randomBytes(32).toString('hex');
    const round = await createGameRound('slots', serverSeed);
    await recordBet(user.id, 'slots', bet, payoutMult || 0, winAmount, round.id);
    await completeGameRound(round.id, user.id, JSON.stringify({ reels, isWin, winAmount }));

    return NextResponse.json({ status: 'success', reels, isWin, payoutMult, winAmount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
