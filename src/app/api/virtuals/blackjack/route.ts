import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { deductBalance, addBalance, createGameRound, recordBet, completeGameRound, getAdminConfig, clearGlobalRig } from '@/lib/dal';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

function adminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

const SUITS = ['♠', '♥', '♣', '♦'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function randomCard() {
  return { suit: SUITS[Math.floor(Math.random() * SUITS.length)], rank: RANKS[Math.floor(Math.random() * RANKS.length)] };
}

function cardValue(rank: string) {
  if (['J', 'Q', 'K'].includes(rank)) return 10;
  if (rank === 'A') return 11;
  return parseInt(rank);
}

function handValue(cards: { rank: string }[]) {
  let total = cards.reduce((s, c) => s + cardValue(c.rank), 0);
  let aces = cards.filter(c => c.rank === 'A').length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

export async function POST(request: Request) {
  try {
    const { action, betAmount, roundId } = await request.json();

    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminClient = adminDb();

    if (action === 'start') {
      const bet = parseFloat(betAmount);
      if (isNaN(bet) || bet <= 0) return NextResponse.json({ error: 'Invalid bet' }, { status: 400 });

      const deducted = await deductBalance(user.id, bet);
      if (!deducted) return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });

      const playerHand = [randomCard(), randomCard()];
      const dealerHand = [randomCard(), randomCard()];

      const serverSeed = crypto.randomBytes(32).toString('hex');
      const round = await createGameRound('blackjack', serverSeed);
      const betRecord = await recordBet(user.id, 'blackjack', bet, null, 0, round.id);

      const state = { playerHand, dealerHand, bet, status: 'playing' };
      await adminClient.from('game_rounds').update({ client_seed: betRecord.id, final_outcome: JSON.stringify(state) }).eq('id', round.id);

      const playerTotal = handValue(playerHand);
      
      // Check for natural Blackjack
      if (playerTotal === 21) {
        const dealerTotal = handValue(dealerHand);
        const win = dealerTotal !== 21 ? bet * 2.5 : bet; // Blackjack pays 3:2 or push
        await addBalance(user.id, win);
        await adminClient.from('bets').update({ multiplier: win / bet, payout_amount: win }).eq('id', betRecord.id);
        await completeGameRound(round.id, betRecord.id, JSON.stringify({ ...state, status: 'blackjack', win }));
        return NextResponse.json({ status: 'blackjack', roundId: round.id, playerHand, dealerHand, playerTotal, winAmount: win });
      }

      return NextResponse.json({ status: 'playing', roundId: round.id, playerHand, dealerHand: [dealerHand[0], { rank: '?', suit: '?' }], playerTotal });
    }

    if (action === 'hit') {
      const { data: round } = await adminClient.from('game_rounds').select('*').eq('id', roundId).single();
      if (!round || round.status !== 'active') return NextResponse.json({ error: 'Invalid round' }, { status: 400 });

      const state = JSON.parse(round.final_outcome);
      const newCard = randomCard();
      state.playerHand.push(newCard);

      const playerTotal = handValue(state.playerHand);
      const busted = playerTotal > 21;

      if (busted) {
        await completeGameRound(roundId, round.client_seed, JSON.stringify({ ...state, status: 'bust' }));
        return NextResponse.json({ status: 'bust', playerHand: state.playerHand, dealerHand: state.dealerHand, playerTotal });
      }

      await adminClient.from('game_rounds').update({ final_outcome: JSON.stringify(state) }).eq('id', roundId);
      return NextResponse.json({ status: 'playing', playerHand: state.playerHand, dealerHand: [state.dealerHand[0], { rank: '?', suit: '?' }], playerTotal });
    }

    if (action === 'stand') {
      const { data: round } = await adminClient.from('game_rounds').select('*').eq('id', roundId).single();
      if (!round || round.status !== 'active') return NextResponse.json({ error: 'Invalid round' }, { status: 400 });

      const state = JSON.parse(round.final_outcome);

      const config = await getAdminConfig();
      let rig = config.globalRigOutcome;
      if (rig) await clearGlobalRig();

      const playerTotal = handValue(state.playerHand);

      if (rig === 'win') {
        // Rig to win: Dealer busts
        while (handValue(state.dealerHand) <= 21) {
          state.dealerHand.push({ rank: '10', suit: '♠' }); // Force bust
        }
      } else if (rig === 'lose') {
        // Rig to lose: Dealer gets exactly 21, or higher than player but under 21
        while (handValue(state.dealerHand) < 21) {
          state.dealerHand.push({ rank: '10', suit: '♠' });
        }
      } else {
        // Fair: Dealer draws until 17+
        while (handValue(state.dealerHand) < 17) {
          state.dealerHand.push(randomCard());
        }
      }

      const dealerTotal = handValue(state.dealerHand);
      const bet = parseFloat(state.bet);

      let winAmount = 0;
      let outcome = 'lose';
      if (dealerTotal > 21 || playerTotal > dealerTotal) { winAmount = bet * 2; outcome = 'win'; }
      else if (playerTotal === dealerTotal) { winAmount = bet; outcome = 'push'; }

      if (winAmount > 0) {
        await addBalance(user.id, winAmount);
        await adminClient.from('bets').update({ multiplier: winAmount / bet, payout_amount: winAmount }).eq('id', round.client_seed);
      }
      await completeGameRound(roundId, round.client_seed, JSON.stringify({ ...state, status: outcome, winAmount }));

      return NextResponse.json({ status: outcome, playerHand: state.playerHand, dealerHand: state.dealerHand, playerTotal, dealerTotal, winAmount });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
