import { NextResponse } from 'next/server';
import { createSupabaseServer, getFastUser } from '@/lib/supabase-server';
import { getProfile, deductBalance, addBalance, getAdminConfig, createGameRound, recordBet, completeGameRound, clearGlobalRig, clearPlinkoRig } from '@/lib/dal';
import crypto from 'crypto';
import { isRateLimited, rateLimitedResponse, getClientIp, checkBodySize, sanitizeInput } from '@/lib/security';

// Standard 12-row Plinko multipliers (from edges to center)
const BUCKET_MULTIPLIERS = [110, 41, 10, 5, 3, 1.5, 1, 0.5, 1, 1.5, 3, 5, 10, 41, 110];

// Probabilities for a 12-row Pascal's triangle
// Index corresponds to bucket 0-14 (12 rows means 13 buckets... wait, 12 rows means 13 possible buckets if we start from center)
// Wait, 12 rows means 13 buckets. 
// Standard: [110, 41, 10, 5, 3, 1.5, 0.5, 1.5, 3, 5, 10, 41, 110] (13 buckets)
const MULTIPLIERS = [100, 25, 10, 5, 2, 0.5, 0.2, 0.5, 2, 5, 10, 25, 100];

export async function POST(request: Request) {
  const sizeError = checkBodySize(request);
  if (sizeError) return sizeError;

  const ip = getClientIp(request);
  if (isRateLimited(`plinko:${ip}`, 5, 10_000)) return rateLimitedResponse();

  try {
    const raw = await request.json();
    const { betAmount } = sanitizeInput(raw);

    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet <= 0) {
      return NextResponse.json({ error: 'Invalid bet amount' }, { status: 400 });
    }

    const user = await getFastUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Deduct Bet atomically
    const deducted = await deductBalance(user.id, bet);
    if (!deducted) {
      return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });
    }

    // 2. Fetch admin config
    const config = await getAdminConfig();
    
    // 3. Determine Outcome Path
    // Plinko generates a path of left/right drops. 
    // 12 rows = 12 decisions. Left = -0.5, Right = +0.5. 
    // Total index ranges from 0 to 12.
    
    let path: number[] = [];
    let bucketIndex = 0;
    let finalMult = 0;

    // Check for rigging overrides
    if (config.globalRigOutcome === 'win') {
      // Force an edge bucket
      bucketIndex = Math.random() > 0.5 ? 0 : 12;
      await clearGlobalRig();
    } else if (config.globalRigOutcome === 'lose') {
      // Force center bucket
      bucketIndex = 6;
      await clearGlobalRig();
    } else if (config.plinkoRiggedBucket && !isNaN(parseInt(config.plinkoRiggedBucket))) {
      // Specific bucket rigging
      bucketIndex = parseInt(config.plinkoRiggedBucket);
      await clearPlinkoRig();
    } else {
      // Fair RNG calculation
      let currentPos = 6; // Start middle
      for(let i=0; i<12; i++) {
        const isRight = Math.random() >= 0.5;
        path.push(isRight ? 1 : -1);
      }
      
      // Calculate final bucket index based on number of Rights (0 to 12)
      let rights = path.filter(p => p === 1).length;
      bucketIndex = rights;
    }

    // Generate a visual path array if we rigged it (so the ball visibly lands there)
    if (path.length === 0) {
      let rightsNeeded = bucketIndex;
      let leftsNeeded = 12 - bucketIndex;
      for(let i=0; i<12; i++) {
        if (rightsNeeded > 0 && leftsNeeded > 0) {
           const isRight = Math.random() > 0.5;
           if (isRight) { rightsNeeded--; path.push(1); }
           else { leftsNeeded--; path.push(-1); }
        } else if (rightsNeeded > 0) {
          rightsNeeded--; path.push(1);
        } else {
          leftsNeeded--; path.push(-1);
        }
      }
    }

    finalMult = MULTIPLIERS[bucketIndex];
    
    // Apply house edge dynamically (e.g. 5% means payouts are 95% of expected)
    const houseEdge = config.plinkoHouseEdge || 5;
    const payoutFactor = (100 - houseEdge) / 100;
    
    // Adjust multiplier slightly by house edge (unless it's the exact center bucket where 0.2 is already very low)
    let adjustedMult = finalMult * payoutFactor;
    // Round to 2 decimal places
    adjustedMult = Math.floor(adjustedMult * 100) / 100;
    // Ensure min payout of 0.1x so users don't get 0
    adjustedMult = Math.max(0.1, adjustedMult);

    const winAmount = bet * adjustedMult;

    // 4. Payout if won
    if (winAmount > 0) {
      await addBalance(user.id, winAmount);
    }

    // 5. Create Game Round and Bet Record securely
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const round = await createGameRound('plinko', serverSeed);
    
    await recordBet(
      user.id,
      'plinko',
      bet,
      adjustedMult,
      winAmount,
      round.id
    );

    await completeGameRound(
      round.id,
      user.id, // using user ID as client seed for solo games
      JSON.stringify({ path, bucketIndex, multiplier: adjustedMult, winAmount })
    );

    // 6. Telemetry
    fetch(new URL('/api/admin/logs', request.url).href, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tag: 'GAMEPLAY',
        message: `🔴 Plinko Drop: Bet ${bet} NGN, Landed Bucket [${bucketIndex}] (${adjustedMult}x), Payout: ${winAmount.toFixed(2)} NGN`
      })
    }).catch(() => {});

    return NextResponse.json({
      status: 'success',
      path,           // The array of [-1, 1, 1, -1, ...]
      bucketIndex,    // Final index 0-12
      multiplier: adjustedMult,
      winAmount
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
