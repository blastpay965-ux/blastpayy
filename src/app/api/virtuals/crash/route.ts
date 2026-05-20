import { NextResponse } from 'next/server';
import { getAdminConfig, updateAdminConfig } from '@/lib/dal';
import crypto from 'crypto';
import { isRateLimited, getClientIp, rateLimitedResponse } from '@/lib/security';
import { getAdminClient } from '@/lib/dal';

// ─── ROUND DURATION CONSTANTS ─────────────────────────────────────────────────
const BETTING_DURATION_MS  = 7_000;  // 7 seconds to place bets
const MAX_FLIGHT_MS        = 60_000; // max 60 seconds of flight
const CRASH_SHOW_MS        = 4_000;  // show crash result for 4 seconds
const ROUND_TOTAL_MS       = BETTING_DURATION_MS + MAX_FLIGHT_MS + CRASH_SHOW_MS;
const GROWTH_RATE          = 0.00007; // per-millisecond exponential rate (moderate speed)

// ─── STATIC PLAYER NAMES ──────────────────────────────────────────────────────
const PLAYER_NAMES = ['d***1', 'a***8', 's***2', 'p***9', 'm***4', 'k***7', 'b***3', 'r***5', 'o***6', 'f***2'];

// ─── DETERMINISTIC MULTIPLIER ─────────────────────────────────────────────────
// Given a seed + elapsed ms, both return the exact same value on any server.
function calcMultiplier(elapsedMs: number): number {
  // e^(rate * ms) — same formula as real Aviator/Crash games
  return Math.max(1.0, Math.exp(GROWTH_RATE * elapsedMs));
}

// ─── DETERMINISTIC CRASH POINT ────────────────────────────────────────────────
// Uses HMAC-SHA256 of the round seed to deterministically pick the crash point.
// Identical result on every server instance for the same seed.
function calcCrashPoint(seed: string, houseEdge: number, maxMult: number, override: number | null): number {
  if (override !== null) return Math.max(1.0, override);

  const hmac = crypto.createHmac('sha256', seed).update('crash').digest('hex');
  // Use first 8 hex chars → 32-bit integer → normalize to [0,1)
  const n = parseInt(hmac.slice(0, 8), 16) / 0xFFFFFFFF;

  // 1 - houseEdge % chance of instant crash at 1.00
  if (n < houseEdge / 100) return 1.00;

  // Exponential distribution crash point in [1, maxMult]
  const crash = Math.max(1.00, 1.00 / (1 - n) * (1 - houseEdge / 100));
  return Math.min(crash, maxMult);
}

// ─── DETERMINISTIC FAKE PLAYERS ──────────────────────────────────────────────
// Same seed → same fake players on every server.
function generatePlayers(seed: string, crashPoint: number) {
  const h = crypto.createHmac('sha256', seed).update('players').digest('hex');
  const count = (parseInt(h.slice(0, 2), 16) % 6) + 4; // 4-9 players
  return Array.from({ length: count }, (_, i) => {
    const chunk = h.slice(i * 4 % 56, (i * 4 % 56) + 4);
    const val   = parseInt(chunk, 16);
    const name  = PLAYER_NAMES[val % PLAYER_NAMES.length];
    const bet   = Math.floor((val % 490) + 10);
    const hasTarget = (val % 10) > 2;
    const cashoutTarget = hasTarget ? 1.1 + (val % 100) / 33 : null;
    const cashedOutAt  = (cashoutTarget && cashoutTarget < crashPoint) ? cashoutTarget : null;
    return {
      id: i,
      name,
      bet,
      cashoutTarget,
      cashedOutAt,
      winAmount: cashedOutAt ? parseFloat((bet * cashedOutAt).toFixed(2)) : null,
    };
  });
}

// ─── SUPABASE ROUND STATE ─────────────────────────────────────────────────────
// We store one row per active round in `crash_rounds` table.
// All Lambda instances read and write the same row.
interface CrashRound {
  id: string;
  seed: string;
  start_time: number; // epoch ms when betting phase started
  crash_point: number;
  status: 'betting' | 'playing' | 'crashed';
  history: number[];
}

async function getOrCreateRound(config: Awaited<ReturnType<typeof getAdminConfig>>): Promise<CrashRound> {
  const supabase = getAdminClient();
  const now = Date.now();

  // Try to get the current active/recent round
  const { data: existing } = await supabase
    .from('crash_rounds')
    .select('*')
    .order('start_time', { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    const elapsed = now - existing.start_time;
    const roundPhaseEnd = BETTING_DURATION_MS + MAX_FLIGHT_MS + CRASH_SHOW_MS;

    // If round is still ongoing, return it
    if (elapsed < roundPhaseEnd) {
      return existing as CrashRound;
    }
  }

  // Create a new round
  const seed = crypto.randomBytes(32).toString('hex');
  const houseEdge   = config.crashHouseEdge ?? 5;
  const maxMult     = config.crashMaxMultiplier ?? 100;
  const override    = config.nextCrashMultiplier ?? null;
  const crashPoint  = calcCrashPoint(seed, houseEdge, maxMult, override);

  // Consume the override now that we've used it
  if (override !== null) {
    updateAdminConfig({ nextCrashMultiplier: null }).catch(() => {});
  }
  if (config.globalRigOutcome) {
    updateAdminConfig({ globalRigOutcome: null }).catch(() => {});
  }

  const history: number[] = existing?.history
    ? [parseFloat(existing.crash_point?.toFixed(2) ?? '1.00'), ...existing.history].slice(0, 20)
    : [1.23, 5.40, 1.05, 2.15, 12.04, 1.83];

  const newRound: Omit<CrashRound, 'id'> = {
    seed,
    start_time: now,
    crash_point: crashPoint,
    status: 'betting',
    history,
  };

  const { data: created, error } = await supabase
    .from('crash_rounds')
    .insert(newRound)
    .select()
    .single();

  if (error || !created) {
    // Fallback: if table doesn't exist yet, return an ephemeral round
    console.error('crash_rounds table missing — run migration. Falling back to ephemeral round.');
    return { id: 'ephemeral', ...newRound } as CrashRound;
  }

  return created as CrashRound;
}

// ─── COMPUTE CURRENT GAME STATE FROM TIME ─────────────────────────────────────
// Pure function — same inputs → same output on every server
function computeState(round: CrashRound, now: number, config: any) {
  const elapsed = now - round.start_time;

  // ── Betting phase ──
  if (elapsed < BETTING_DURATION_MS) {
    return {
      status: 'betting' as const,
      multiplier: 1.0,
      timeLeft: parseFloat(((BETTING_DURATION_MS - elapsed) / 1000).toFixed(1)),
      roundId: round.id,
      history: round.history,
      players: [],
      crashPoint: round.crash_point,
    };
  }

  const flightElapsed = elapsed - BETTING_DURATION_MS;

  // Check for mid-air rig from admin
  let effectiveCrashPoint = round.crash_point;
  if (config.nextCrashMultiplier !== null) {
    effectiveCrashPoint = Math.max(1.00, config.nextCrashMultiplier);
  } else if (config.isRigged || config.globalRigOutcome === 'lose') {
    effectiveCrashPoint = 1.00;
  }

  const currentMult = calcMultiplier(flightElapsed);
  const hasCrashed  = currentMult >= effectiveCrashPoint || flightElapsed >= MAX_FLIGHT_MS;

  // ── Crashed phase ──
  if (hasCrashed) {
    const crashedAt = flightElapsed >= MAX_FLIGHT_MS
      ? calcMultiplier(MAX_FLIGHT_MS)
      : effectiveCrashPoint;

    const crashElapsed = hasCrashed
      ? Math.min(flightElapsed, MAX_FLIGHT_MS) + (elapsed - BETTING_DURATION_MS - Math.min(flightElapsed, MAX_FLIGHT_MS))
      : 0;

    // Calculate time since crash
    const crashTime  = round.start_time + BETTING_DURATION_MS + Math.min(
      Math.log(effectiveCrashPoint) / GROWTH_RATE,
      MAX_FLIGHT_MS
    );
    const afterCrash = now - crashTime;
    const timeLeft   = Math.max(0, (CRASH_SHOW_MS - afterCrash) / 1000);

    const players = generatePlayers(round.seed, crashedAt);

    return {
      status: 'crashed' as const,
      multiplier: parseFloat(crashedAt.toFixed(4)),
      timeLeft: parseFloat(timeLeft.toFixed(1)),
      roundId: round.id,
      history: round.history,
      players,
      crashPoint: crashedAt,
    };
  }

  // ── Playing phase ──
  const players = generatePlayers(round.seed, round.crash_point);
  // Mark players who would have cashed out by now
  const activePlayers = players.map(p => ({
    ...p,
    cashedOutAt: p.cashoutTarget && p.cashoutTarget <= currentMult ? p.cashoutTarget : null,
    winAmount: p.cashoutTarget && p.cashoutTarget <= currentMult
      ? parseFloat((p.bet * p.cashoutTarget).toFixed(2))
      : null,
  }));

  return {
    status: 'playing' as const,
    multiplier: parseFloat(currentMult.toFixed(4)),
    timeLeft: 0,
    roundId: round.id,
    history: round.history,
    players: activePlayers,
    crashPoint: round.crash_point,
  };
}

// ─── GET HANDLER ──────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const ip = getClientIp(request);
  if (isRateLimited(`crash-poll:${ip}`, 120, 60_000)) return rateLimitedResponse();

  const [config, round] = await Promise.all([
    getAdminConfig(),
    getOrCreateRound(await getAdminConfig()),
  ]);

  const state = computeState(round, Date.now(), config);

  return NextResponse.json({
    status:     state.status,
    multiplier: state.multiplier,
    timeLeft:   state.timeLeft,
    history:    state.history,
    players:    state.players,
    roundId:    state.roundId,
  });
}
