import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { getAdminConfig, clearGlobalRig, deductBalance, addBalance, createGameRound, recordBet, completeGameRound } from '@/lib/dal';
import crypto from 'crypto';

const RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];

const PAYOUTS: Record<string, number> = {
  red: 2, black: 2, green: 14, even: 2, odd: 2, '1-18': 2, '19-36': 2
};

export async function POST(request: Request) {
  try {
    const { betAmount, selectedBet } = await request.json();
    const bet = parseFloat(betAmount);

    if (isNaN(bet) || bet <= 0 || !selectedBet) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const deducted = await deductBalance(user.id, bet);
    if (!deducted) return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });

    const config = await getAdminConfig();
    let rig = config.globalRigOutcome;
    if (rig) await clearGlobalRig();

    let winningNumber = Math.floor(Math.random() * 37);

    if (rig === 'win') {
      if (selectedBet === 'red') winningNumber = RED_NUMBERS[0];
      else if (selectedBet === 'black') winningNumber = 2;
      else if (selectedBet === 'green') winningNumber = 0;
      else if (selectedBet === 'even') winningNumber = 2;
      else if (selectedBet === 'odd') winningNumber = 1;
      else if (selectedBet === '1-18') winningNumber = 5;
      else if (selectedBet === '19-36') winningNumber = 25;
    } else if (rig === 'lose') {
      if (selectedBet === 'red') winningNumber = 2;
      else if (selectedBet === 'black') winningNumber = RED_NUMBERS[0];
      else if (selectedBet === 'green') winningNumber = RED_NUMBERS[0];
      else if (selectedBet === 'even') winningNumber = 1;
      else if (selectedBet === 'odd') winningNumber = 2;
      else if (selectedBet === '1-18') winningNumber = 25;
      else if (selectedBet === '19-36') winningNumber = 5;
    }

    const isRed = RED_NUMBERS.includes(winningNumber);
    const isBlack = winningNumber !== 0 && !isRed;
    const isEven = winningNumber !== 0 && winningNumber % 2 === 0;
    const isOdd = winningNumber !== 0 && winningNumber % 2 !== 0;

    let isWin = false;
    switch (selectedBet) {
      case 'red': isWin = isRed; break;
      case 'black': isWin = isBlack; break;
      case 'green': isWin = winningNumber === 0; break;
      case 'even': isWin = isEven; break;
      case 'odd': isWin = isOdd; break;
      case '1-18': isWin = winningNumber >= 1 && winningNumber <= 18; break;
      case '19-36': isWin = winningNumber >= 19 && winningNumber <= 36; break;
    }

    const payout = PAYOUTS[selectedBet] || 2;
    const winAmount = isWin ? bet * payout : 0;

    if (isWin && winAmount > 0) await addBalance(user.id, winAmount);

    const serverSeed = crypto.randomBytes(32).toString('hex');
    const round = await createGameRound('roulette', serverSeed);
    await recordBet(user.id, 'roulette', bet, payout, winAmount, round.id);
    await completeGameRound(round.id, user.id, JSON.stringify({ winningNumber, selectedBet, isWin, winAmount }));

    return NextResponse.json({ status: 'success', winningNumber, isWin, winAmount, isRed, isBlack });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
