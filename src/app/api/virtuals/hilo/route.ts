import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { deductBalance, addBalance, createGameRound, recordBet, completeGameRound, getAdminConfig, clearGlobalRig } from '@/lib/dal';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

function adminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

const SUITS = ['♠', '♥', '♣', '♦'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function randomCard() {
  const rankIndex = Math.floor(Math.random() * RANKS.length);
  return { suit: SUITS[Math.floor(Math.random() * SUITS.length)], rank: RANKS[rankIndex], value: rankIndex + 2 };
}

function getPayouts(cardValue: number) {
  const higherCards = 14 - cardValue;
  const lowerCards = cardValue - 2;
  return {
    higherMult: higherCards > 0 ? 12.35 / higherCards : 0,
    lowerMult: lowerCards > 0 ? 12.35 / lowerCards : 0
  };
}

export async function POST(request: Request) {
  try {
    const { action, betAmount, guess, roundId, currentCardValue, multiplier } = await request.json();

    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminClient = adminDb();

    if (action === 'start') {
      const bet = parseFloat(betAmount);
      if (isNaN(bet) || bet <= 0) return NextResponse.json({ error: 'Invalid bet' }, { status: 400 });

      const deducted = await deductBalance(user.id, bet);
      if (!deducted) return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });

      const card = randomCard();
      const serverSeed = crypto.randomBytes(32).toString('hex');
      const round = await createGameRound('hilo', serverSeed);
      const betRecord = await recordBet(user.id, 'hilo', bet, null, 0, round.id);

      // Store bet ID in client_seed for later retrieval
      await adminClient.from('game_rounds').update({ client_seed: betRecord.id }).eq('id', round.id);
      await adminClient.from('game_rounds').update({ final_outcome: JSON.stringify({ card, mult: 1 }) }).eq('id', round.id);

      return NextResponse.json({ status: 'success', roundId: round.id, card });
    }

    if (action === 'guess') {
      if (!roundId || !guess) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

      const { data: round } = await adminClient.from('game_rounds').select('*').eq('id', roundId).single();
      if (!round || round.status !== 'active') return NextResponse.json({ error: 'Invalid round' }, { status: 400 });

      const state = JSON.parse(round.final_outcome);
      const prevCard = state.card;
      const currentMult = state.mult;

      const config = await getAdminConfig();
      let rig = config.globalRigOutcome;
      if (rig) await clearGlobalRig();

      let nextCard = randomCard();

      if (rig === 'win') {
        while ((guess === 'higher' && nextCard.value <= prevCard.value) || (guess === 'lower' && nextCard.value >= prevCard.value)) {
          nextCard = randomCard();
        }
      } else if (rig === 'lose') {
        while ((guess === 'higher' && nextCard.value > prevCard.value) || (guess === 'lower' && nextCard.value < prevCard.value)) {
          nextCard = randomCard();
        }
      }

      const isCorrect = guess === 'higher' ? nextCard.value > prevCard.value : nextCard.value < prevCard.value;

      if (!isCorrect) {
        await completeGameRound(roundId, round.client_seed, JSON.stringify({ ...state, card: nextCard, lost: true }));
        return NextResponse.json({ status: 'bust', card: nextCard });
      }

      const { higherMult, lowerMult } = getPayouts(prevCard.value);
      const stepMult = guess === 'higher' ? higherMult : lowerMult;
      const newMult = currentMult * stepMult;

      await adminClient.from('game_rounds').update({ final_outcome: JSON.stringify({ card: nextCard, mult: newMult }) }).eq('id', roundId);

      return NextResponse.json({ status: 'correct', card: nextCard, multiplier: newMult });
    }

    if (action === 'cashout') {
      if (!roundId || !multiplier || !betAmount) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

      const { data: round } = await adminClient.from('game_rounds').select('*').eq('id', roundId).single();
      if (!round || round.status !== 'active') return NextResponse.json({ error: 'Invalid round' }, { status: 400 });

      const bet = parseFloat(betAmount);
      const mult = parseFloat(multiplier);
      const winAmount = bet * mult;

      await addBalance(user.id, winAmount);
      await adminClient.from('bets').update({ multiplier: mult, payout_amount: winAmount }).eq('id', round.client_seed);
      await completeGameRound(roundId, round.client_seed, JSON.stringify({ cashed: true, mult, winAmount }));

      return NextResponse.json({ status: 'success', winAmount });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
