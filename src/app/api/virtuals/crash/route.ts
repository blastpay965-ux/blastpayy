import { NextResponse } from 'next/server';
import { getAdminConfig, createGameRound, completeGameRound } from '@/lib/dal';
import crypto from 'crypto';
import { isRateLimited, getClientIp, rateLimitedResponse } from '@/lib/security';

const PLAYER_NAMES = ['d***1', 'a***8', 's***2', 'p***9', 'm***4', 'k***7', 'b***3', 'r***5'];

// In-memory game state (ephemeral by design — resets on server restart)
const gameState = {
  status: 'betting' as 'betting' | 'playing' | 'crashed',
  multiplier: 1.00,
  targetCrash: 0,
  timeLeft: 5,
  lastUpdate: Date.now(),
  history: [1.23, 5.40, 1.05, 2.15, 12.04, 1.83, 1.00, 3.45] as number[],
  players: [] as { id: number, name: string, bet: number, cashoutTarget: number | null, cashedOutAt: number | null, winAmount: number | null }[],
  currentRoundId: null as string | null,
  currentServerSeed: null as string | null,
};

function generatePlayers() {
  const count = Math.floor(Math.random() * 5) + 3;
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: PLAYER_NAMES[Math.floor(Math.random() * PLAYER_NAMES.length)],
    bet: Math.floor(Math.random() * 100) + 10,
    cashoutTarget: Math.random() > 0.3 ? 1.1 + Math.random() * 3 : null,
    cashedOutAt: null,
    winAmount: null,
  }));
}

async function updateGameState() {
  const now = Date.now();
  const delta = (now - gameState.lastUpdate) / 1000;
  gameState.lastUpdate = now;

  if (gameState.status === 'betting') {
    gameState.timeLeft -= delta;
    if (gameState.timeLeft <= 0) {
      gameState.status = 'playing';
      gameState.multiplier = 1.00;

      // Fetch live admin config from Supabase DB
      const config = await getAdminConfig();
      const houseEdge      = config.crashHouseEdge ?? 5;
      const maxMultiplier  = config.crashMaxMultiplier ?? 100;
      const isRigged       = config.isRigged ?? false;
      const nextOverride   = config.nextCrashMultiplier ?? null;

      if (nextOverride !== null) {
        gameState.targetCrash = Math.max(1.00, nextOverride);
        // Reset override: done via admin dashboard saving null
      } else if (isRigged) {
        gameState.targetCrash = 1.00;
      } else if (Math.random() < houseEdge / 100) {
        gameState.targetCrash = 1.00;
      } else {
        const r = Math.random();
        gameState.targetCrash = Math.max(1.00, 1.00 + Math.pow(r, 4) * maxMultiplier);
      }

      gameState.players = generatePlayers();
      
      // Create round securely
      try {
        const seed = crypto.randomBytes(32).toString('hex');
        const round = await createGameRound('crash', seed);
        gameState.currentRoundId = round.id;
        gameState.currentServerSeed = seed;
      } catch (err) {
        console.error('Failed to create game round', err);
      }
    }
  } else if (gameState.status === 'playing') {
    gameState.multiplier += (gameState.multiplier * 0.15) * delta;

    gameState.players.forEach((p) => {
      if (p.cashoutTarget && !p.cashedOutAt && gameState.multiplier >= p.cashoutTarget) {
        p.cashedOutAt = p.cashoutTarget;
        p.winAmount = p.bet * p.cashoutTarget;
      }
    });

    if (gameState.multiplier >= gameState.targetCrash) {
      gameState.status = 'crashed';
      gameState.multiplier = gameState.targetCrash;
      gameState.timeLeft = 3;
      gameState.history.unshift(parseFloat(gameState.targetCrash.toFixed(2)));
      if (gameState.history.length > 20) gameState.history.pop();
      
      // Complete round securely
      if (gameState.currentRoundId && gameState.currentServerSeed) {
        try {
          await completeGameRound(
            gameState.currentRoundId,
            gameState.currentServerSeed, // In Crash, the server seed is the target crash hash (simplified)
            JSON.stringify({ crashPoint: gameState.targetCrash })
          );
        } catch (err) {
          console.error('Failed to complete game round', err);
        }
      }
    }
  } else if (gameState.status === 'crashed') {
    gameState.timeLeft -= delta;
    if (gameState.timeLeft <= 0) {
      gameState.status = 'betting';
      gameState.timeLeft = 5;
      gameState.multiplier = 1.00;
      gameState.players = [];
    }
  }
}

export async function GET(request: Request) {
  const ip = getClientIp(request);
  if (isRateLimited(`crash-poll:${ip}`, 120, 60_000)) return rateLimitedResponse();

  await updateGameState();
  return NextResponse.json({
    status: gameState.status,
    multiplier: parseFloat(gameState.multiplier.toFixed(4)),
    timeLeft: Math.max(0, gameState.timeLeft),
    history: gameState.history,
    players: gameState.players,
    roundId: gameState.currentRoundId
  });
}
