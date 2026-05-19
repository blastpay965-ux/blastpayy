import { NextResponse } from 'next/server';
import { createSupabaseServer, getFastUser } from '@/lib/supabase-server';
import { deductBalance, addBalance, createGameRound, recordBet, completeGameRound, getAdminConfig } from '@/lib/dal';

function calculateMultiplier(mines: number, hits: number, houseEdge: number) {
  let p = 1.0;
  for (let i = 0; i < hits; i++) {
    p *= (25 - mines - i) / (25 - i);
  }
  const scaleFactor = 1 - (houseEdge / 100);
  return (1 / p) * scaleFactor;
}

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const { action, roundId, betAmount, mineCount, index } = raw;

    const user = await getFastUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Quick admin client for fetching/updating secure round info
    const { createClient } = require('@supabase/supabase-js');
    const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const config = await getAdminConfig();
    const houseEdge = config.minesHouseEdge ?? 5;

    if (action === 'start') {
      const bet = parseFloat(betAmount);
      if (isNaN(bet) || bet <= 0) return NextResponse.json({ error: 'Invalid bet' }, { status: 400 });

      const deducted = await deductBalance(user.id, bet);
      if (!deducted) return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });

      // Generate Grid
      const grid = Array(25).fill(false);
      let placed = 0;
      while (placed < mineCount) {
        const idx = Math.floor(Math.random() * 25);
        if (!grid[idx]) {
          grid[idx] = true;
          placed++;
        }
      }

      // Store grid in serverSeed as JSON
      const serverSeed = JSON.stringify(grid);
      const round = await createGameRound('mines', serverSeed);
      
      const betRecord = await recordBet(user.id, 'mines', bet, null, 0, round.id);
      
      // Store betId in clientSeed for easy retrieval later
      await adminClient.from('game_rounds').update({ client_seed: betRecord.id }).eq('id', round.id);

      return NextResponse.json({ status: 'success', roundId: round.id });
    }

    if (action === 'click') {
      if (!roundId || index === undefined) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

      const { data: round } = await adminClient.from('game_rounds').select('*').eq('id', roundId).single();
      if (!round || round.status !== 'active') return NextResponse.json({ error: 'Invalid round' }, { status: 400 });

      const grid = JSON.parse(round.server_seed);
      let clicked = round.final_outcome ? JSON.parse(round.final_outcome) : [];

      if (clicked.includes(index)) return NextResponse.json({ error: 'Already clicked' }, { status: 400 });

      // Check for Admin Override!
      let isMine = grid[index];
      if (config.isMinesRiggedNextClick === 'bomb') {
        isMine = true;
        // Reset rig
        await adminClient.from('admin_config').update({ mines_rigged_next_click: null }).eq('id', 1);
      } else if (config.isMinesRiggedNextClick === 'gem') {
        isMine = false;
        await adminClient.from('admin_config').update({ mines_rigged_next_click: null }).eq('id', 1);
      }

      clicked.push(index);

      if (isMine) {
        // Boom! Game Over.
        await completeGameRound(roundId, round.client_seed, JSON.stringify(clicked));
        // Bet is already recorded as 0 payout, no need to update it.
        return NextResponse.json({ status: 'bomb', grid }); // Return full grid so client can reveal all
      } else {
        // Safe! Update clicked indices in DB
        await adminClient.from('game_rounds').update({ final_outcome: JSON.stringify(clicked) }).eq('id', roundId);
        
        // Calculate current multiplier
        const minesCount = grid.filter((x: boolean) => x).length;
        const currentMult = calculateMultiplier(minesCount, clicked.length, houseEdge);

        return NextResponse.json({ status: 'gem', multiplier: currentMult });
      }
    }

    if (action === 'cashout') {
      if (!roundId) return NextResponse.json({ error: 'Missing roundId' }, { status: 400 });

      const { data: round } = await adminClient.from('game_rounds').select('*').eq('id', roundId).single();
      if (!round || round.status !== 'active') return NextResponse.json({ error: 'Invalid round' }, { status: 400 });

      const grid = JSON.parse(round.server_seed);
      const clicked = round.final_outcome ? JSON.parse(round.final_outcome) : [];
      
      const minesCount = grid.filter((x: boolean) => x).length;
      const finalMult = calculateMultiplier(minesCount, clicked.length, houseEdge);
      
      // Get the original bet
      const { data: betRecord } = await adminClient.from('bets').select('*').eq('id', round.client_seed).single();
      if (!betRecord) return NextResponse.json({ error: 'Bet not found' }, { status: 400 });

      const winAmount = parseFloat(betRecord.bet_amount) * finalMult;

      // Add balance
      await addBalance(user.id, winAmount);

      // Update bet
      await adminClient.from('bets').update({
        multiplier: finalMult,
        payout_amount: winAmount
      }).eq('id', betRecord.id);

      // Complete round
      await completeGameRound(roundId, round.client_seed, JSON.stringify(clicked));

      return NextResponse.json({ status: 'success', winAmount, grid }); // Return grid to reveal
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
