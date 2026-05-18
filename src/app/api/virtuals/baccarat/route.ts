import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { deductBalance, addBalance, createGameRound, recordBet, completeGameRound, getAdminConfig, clearGlobalRig } from '@/lib/dal';
import crypto from 'crypto';

const SUITS = ['♠', '♥', '♣', '♦'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function randomCard() {
  return { suit: SUITS[Math.floor(Math.random() * SUITS.length)], rank: RANKS[Math.floor(Math.random() * RANKS.length)] };
}

function baccaratValue(rank: string) {
  if (['10', 'J', 'Q', 'K'].includes(rank)) return 0;
  if (rank === 'A') return 1;
  return parseInt(rank);
}

function handScore(cards: { rank: string }[]) {
  return cards.reduce((s, c) => (s + baccaratValue(c.rank)) % 10, 0);
}

export async function POST(request: Request) {
  try {
    const { betAmount, betOn } = await request.json(); // betOn: 'player' | 'banker' | 'tie'
    const bet = parseFloat(betAmount);

    if (isNaN(bet) || bet <= 0 || !['player', 'banker', 'tie'].includes(betOn)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const deducted = await deductBalance(user.id, bet);
    if (!deducted) return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });

    // Deal initial hands
    const playerHand = [randomCard(), randomCard()];
    const bankerHand = [randomCard(), randomCard()];

    let playerScore = handScore(playerHand);
    let bankerScore = handScore(bankerHand);

    // Baccarat drawing rules (simplified tableau)
    // Player draws on 0-5
    if (playerScore <= 5) playerHand.push(randomCard());
    playerScore = handScore(playerHand);

    // Banker draws on 0-5 (simplified)
    if (bankerScore <= 5) bankerHand.push(randomCard());
    bankerScore = handScore(bankerHand);

    let outcome: 'player' | 'banker' | 'tie';
    if (playerScore > bankerScore) outcome = 'player';
    else if (bankerScore > playerScore) outcome = 'banker';
    else outcome = 'tie';

    const config = await getAdminConfig();
    let rig = config.globalRigOutcome;
    if (rig) {
      await clearGlobalRig();
      if (rig === 'win') {
        outcome = betOn;
      } else if (rig === 'lose') {
        outcome = betOn === 'player' ? 'banker' : 'player';
      }
    }

    // Payouts: Player 1:1, Banker 0.95:1 (5% commission), Tie 8:1
    let winAmount = 0;
    if (betOn === outcome) {
      if (betOn === 'player') winAmount = bet * 2;
      else if (betOn === 'banker') winAmount = bet * 1.95;
      else if (betOn === 'tie') winAmount = bet * 9;
    }

    if (winAmount > 0) await addBalance(user.id, winAmount);

    const serverSeed = crypto.randomBytes(32).toString('hex');
    const round = await createGameRound('baccarat', serverSeed);
    const mult = winAmount > 0 ? winAmount / bet : 0;
    await recordBet(user.id, 'baccarat', bet, mult, winAmount, round.id);
    await completeGameRound(round.id, user.id, JSON.stringify({ playerHand, bankerHand, playerScore, bankerScore, outcome, betOn, winAmount }));

    return NextResponse.json({ status: 'success', playerHand, bankerHand, playerScore, bankerScore, outcome, winAmount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
