/**
 * Data Access Layer (DAL) — BlastPay
 *
 * ALL database access goes through this module.
 * Uses the Supabase JS admin client (service role key) which bypasses RLS
 * and connects via Supabase's secure REST/PostgREST API.
 * No raw DATABASE_URL needed — works out of the box with Supabase keys.
 *
 * Marked server-only: cannot be imported in client components.
 */
import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ── Singleton admin client ─────────────────────────────────────────────────────
// Supabase client creation is expensive (TLS, auth setup). Reuse one instance.
let _adminClient: SupabaseClient | null = null;
export function getAdminClient(): SupabaseClient {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return _adminClient;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProfileDTO {
  id: string;
  username: string;
  accountNumber: string;
  isGuest: boolean;
  contact: string;
  balance: number;
}

export interface TransactionDTO {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  currency: string;
  status: 'successful' | 'pending' | 'failed';
  date: string;
}

export interface AdminConfigDTO {
  crashHouseEdge: number;
  crashMaxMultiplier: number;
  minesHouseEdge: number;
  isRigged: boolean;
  nextCrashMultiplier: number | null;
  isMinesRiggedNextClick: 'bomb' | 'gem' | null;
  plinkoHouseEdge: number;
  plinkoRiggedBucket: string | null;
  globalRigOutcome: 'win' | 'lose' | null;
  sandboxPaymentMode: boolean;
  bannedUsers: string[];
  frozenUsers: string[];
  totalDeposits: number;
  totalWithdrawals: number;
  activeUsersCount: number;
  simulatedGrowth: number;
}

export interface GameRoundDTO {
  id: string;
  gameType: string;
  serverSeed: string;
  clientSeed: string | null;
  finalOutcome: string | null;
  status: 'active' | 'completed';
  createdAt: string;
}

export interface BetDTO {
  id: string;
  userId: string;
  gameRoundId: string | null;
  gameType: string;
  betAmount: number;
  multiplier: number | null;
  payoutAmount: number;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function generateAccountNumber(): string {
  return `ACC-${Math.floor(10_000_000 + Math.random() * 90_000_000)}`;
}

// ─── Profile Queries ──────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<ProfileDTO | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return {
    id: data.id,
    username: data.username,
    accountNumber: data.account_number,
    isGuest: data.is_guest,
    contact: data.contact ?? '',
    balance: parseFloat(data.balance),
  };
}

export async function getProfileByUsername(username: string): Promise<ProfileDTO | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username.trim())
    .single();

  if (error || !data) return null;
  return {
    id: data.id,
    username: data.username,
    accountNumber: data.account_number,
    isGuest: data.is_guest,
    contact: data.contact ?? '',
    balance: parseFloat(data.balance),
  };
}

export async function createProfile(
  userId: string,
  username: string,
  contact: string,
  isGuest = false
): Promise<ProfileDTO> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      username: username.trim(),
      account_number: generateAccountNumber(),
      is_guest: isGuest,
      contact: contact.trim(),
      balance: 0,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to create profile');
  return {
    id: data.id,
    username: data.username,
    accountNumber: data.account_number,
    isGuest: data.is_guest,
    contact: data.contact ?? '',
    balance: 0,
  };
}

// ─── Transaction Queries ──────────────────────────────────────────────────────

export async function getTransactions(userId: string): Promise<TransactionDTO[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    type: r.type as 'deposit' | 'withdrawal',
    amount: parseFloat(r.amount),
    currency: r.currency,
    status: r.status as 'successful' | 'pending' | 'failed',
    date: new Date(r.created_at).toLocaleString(),
  }));
}

async function addTransaction(
  userId: string,
  type: 'deposit' | 'withdrawal',
  amount: number,
  status: 'successful' | 'pending' | 'failed' = 'successful',
  reference?: string
): Promise<void> {
  const supabase = getAdminClient();
  await supabase.from('transactions').insert({
    user_id: userId,
    type,
    amount,
    currency: 'NGN',
    status,
    reference: reference ?? `tx-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
  });
}

// ─── Game Rounds & Bets Queries ───────────────────────────────────────────────

export async function createGameRound(gameType: string, serverSeed: string): Promise<GameRoundDTO> {
  const supabase = getAdminClient();
  const { data, error } = await supabase.from('game_rounds').insert({
    game_type: gameType,
    server_seed: serverSeed,
    status: 'active'
  }).select().single();

  if (error || !data) throw new Error(error?.message || 'Failed to create game round');
  
  return {
    id: data.id,
    gameType: data.game_type,
    serverSeed: data.server_seed,
    clientSeed: data.client_seed,
    finalOutcome: data.final_outcome,
    status: data.status,
    createdAt: new Date(data.created_at).toISOString()
  };
}

export async function completeGameRound(roundId: string, clientSeed: string, finalOutcome: string): Promise<void> {
  const supabase = getAdminClient();
  // Fire-and-forget: audit log doesn't need to block the API response
  supabase.from('game_rounds').update({
    client_seed: clientSeed,
    final_outcome: finalOutcome,
    status: 'completed',
    completed_at: new Date().toISOString()
  }).eq('id', roundId).then(() => {/* intentional fire-and-forget */});
}

export async function recordBet(
  userId: string, 
  gameType: string, 
  betAmount: number, 
  multiplier: number | null = null, 
  payoutAmount: number = 0,
  gameRoundId: string | null = null
): Promise<BetDTO> {
  const supabase = getAdminClient();
  const { data, error } = await supabase.from('bets').insert({
    user_id: userId,
    game_round_id: gameRoundId,
    game_type: gameType,
    bet_amount: betAmount,
    multiplier,
    payout_amount: payoutAmount
  }).select().single();

  if (error || !data) throw new Error(error?.message || 'Failed to record bet');

  return {
    id: data.id,
    userId: data.user_id,
    gameRoundId: data.game_round_id,
    gameType: data.game_type,
    betAmount: parseFloat(data.bet_amount),
    multiplier: data.multiplier ? parseFloat(data.multiplier) : null,
    payoutAmount: parseFloat(data.payout_amount),
    createdAt: new Date(data.created_at).toISOString()
  };
}

export async function getBetHistory(userId: string): Promise<BetDTO[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase.from('bets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return data.map(r => ({
    id: r.id,
    userId: r.user_id,
    gameRoundId: r.game_round_id,
    gameType: r.game_type,
    betAmount: parseFloat(r.bet_amount),
    multiplier: r.multiplier ? parseFloat(r.multiplier) : null,
    payoutAmount: parseFloat(r.payout_amount),
    createdAt: new Date(r.created_at).toLocaleString()
  }));
}

// ─── Atomic Wallet Mutations via Postgres RPC ─────────────────────────────────
// Using Supabase RPC (stored procedure) for atomic balance updates.
// This prevents race conditions — the balance check and update happen in one SQL statement.

export async function depositBalance(userId: string, amount: number, logTransaction = true): Promise<number | null> {
  const supabase = getAdminClient();

  // Use RPC for atomic update
  const { data, error } = await supabase.rpc('deposit_balance', {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error || data === null) {
    // Fallback: direct update if RPC not yet created
    const { data: updated, error: updateErr } = await supabase
      .from('profiles')
      .update({ balance: supabase.rpc as any }) // will be replaced by RPC
      .eq('id', userId)
      .select('balance')
      .single();

    // Simple fallback update
    const { data: profile } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', userId)
      .single();

    if (!profile) return null;
    const currentBalance = parseFloat(profile.balance);
    const newBalance = currentBalance + amount;

    const { error: setErr } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', userId);

    if (setErr) return null;
    if (logTransaction) await addTransaction(userId, 'deposit', amount);
    return newBalance;
  }

  if (logTransaction) await addTransaction(userId, 'deposit', amount);
  return typeof data === 'number' ? data : parseFloat(data);
}

export async function createPendingTransaction(userId: string, amount: number, reference: string, type: 'deposit' | 'withdrawal' = 'deposit'): Promise<string | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: type,
      amount,
      currency: 'NGN',
      status: 'pending',
      reference: reference
    })
    .select('id')
    .single();

  if (error || !data) return null;
  return data.id;
}

export async function approvePendingTransaction(transactionId: string): Promise<boolean> {
  const supabase = getAdminClient();
  
  // Fetch transaction details
  const { data: tx, error: txErr } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single();
    
  if (txErr || !tx || tx.status !== 'pending') return false;
  
  // Atomically update status to successful
  const { error: updateErr } = await supabase
    .from('transactions')
    .update({ status: 'successful' })
    .eq('id', transactionId);
    
  if (updateErr) return false;
  
  if (tx.type === 'deposit') {
    // Fetch profile details
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', tx.user_id)
      .single();
      
    if (profErr || !profile) return false;
    
    const currentBalance = parseFloat(profile.balance);
    const newBalance = currentBalance + parseFloat(tx.amount);
    
    // Update user balance
    const { error: setErr } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', tx.user_id);
      
    if (setErr) return false;

    // Increment total deposits in adminConfig
    const { data: config } = await supabase
      .from('admin_config')
      .select('total_deposits')
      .eq('id', 1)
      .single();

    if (config) {
      const newTotalDeposits = parseFloat(config.total_deposits) + parseFloat(tx.amount);
      await supabase
        .from('admin_config')
        .update({ total_deposits: newTotalDeposits })
        .eq('id', 1);
    }
  } else if (tx.type === 'withdrawal') {
    // Balance was already deducted when requested, just increment config stats
    const { data: config } = await supabase
      .from('admin_config')
      .select('total_withdrawals')
      .eq('id', 1)
      .single();

    if (config) {
      const newTotalWithdrawals = parseFloat(config.total_withdrawals) + parseFloat(tx.amount);
      await supabase
        .from('admin_config')
        .update({ total_withdrawals: newTotalWithdrawals })
        .eq('id', 1);
    }
  }
  
  return true;
}

export async function rejectPendingTransaction(transactionId: string): Promise<boolean> {
  const supabase = getAdminClient();
  
  // Fetch transaction details
  const { data: tx, error: txErr } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single();
    
  if (txErr || !tx || tx.status !== 'pending') return false;
  
  // Atomically update status to failed
  const { error: updateErr } = await supabase
    .from('transactions')
    .update({ status: 'failed' })
    .eq('id', transactionId);
    
  if (updateErr) return false;

  if (tx.type === 'withdrawal') {
    // Refund the deducted balance back to the player without logging a successful deposit
    await depositBalance(tx.user_id, parseFloat(tx.amount), false);
  }

  return true;
}


export async function deductBalance(userId: string, amount: number, logTransaction = true): Promise<number | null> {
  const supabase = getAdminClient();

  // Try RPC first (atomic)
  const { data, error } = await supabase.rpc('deduct_balance', {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error || data === null) {
    // Fallback: fetch current balance and check
    const { data: profile } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', userId)
      .single();

    if (!profile) return null;
    const currentBalance = parseFloat(profile.balance);
    if (currentBalance < amount) return null; // insufficient funds

    const newBalance = currentBalance - amount;
    const { error: setErr } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', userId);

    if (setErr) return null;
    if (logTransaction) await addTransaction(userId, 'withdrawal', amount);
    return newBalance;
  }

  if (data === -1) return null; // RPC returns -1 for insufficient funds
  if (logTransaction) await addTransaction(userId, 'withdrawal', amount);
  return typeof data === 'number' ? data : parseFloat(data);
}

/**
 * Add winnings to a user's balance.
 * Wrapper around depositBalance for use in game route payout logic.
 */
export async function addBalance(userId: string, amount: number): Promise<number | null> {
  return depositBalance(userId, amount);
}

/**
 * Clear the global rig outcome after it has been consumed by a game round.
 * Called by all game routes after reading the rig state so it only fires once.
 */
export async function clearGlobalRig(): Promise<void> {
  const supabase = getAdminClient();
  await supabase.from('admin_config').update({ global_rig_outcome: null }).eq('id', 1);
}

/**
 * Clear the specific plinko rigged bucket after it has been consumed.
 */
export async function clearPlinkoRig(): Promise<void> {
  const supabase = getAdminClient();
  await supabase.from('admin_config').update({ plinko_rigged_bucket: null }).eq('id', 1);
}

// ─── Admin Config ─────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: AdminConfigDTO = {
  crashHouseEdge: 5, crashMaxMultiplier: 100, minesHouseEdge: 5, plinkoHouseEdge: 5,
  isRigged: false, nextCrashMultiplier: null, isMinesRiggedNextClick: null, plinkoRiggedBucket: null,
  globalRigOutcome: null, sandboxPaymentMode: true, bannedUsers: [],
  frozenUsers: [], totalDeposits: 254000, totalWithdrawals: 112000,
  activeUsersCount: 148, simulatedGrowth: 15.4,
};

export async function getAdminConfig(): Promise<AdminConfigDTO> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('admin_config')
    .select('*')
    .eq('id', 1)
    .single();

  if (error || !data) return { ...DEFAULT_CONFIG };

  return {
    crashHouseEdge:          parseFloat(data.crash_house_edge),
    crashMaxMultiplier:      parseFloat(data.crash_max_multiplier),
    minesHouseEdge:          parseFloat(data.mines_house_edge),
    isRigged:                data.is_rigged,
    nextCrashMultiplier:     data.next_crash_multiplier ? parseFloat(data.next_crash_multiplier) : null,
    isMinesRiggedNextClick:  data.mines_rigged_next_click as 'bomb' | 'gem' | null,
    plinkoHouseEdge:         data.plinko_house_edge ? parseFloat(data.plinko_house_edge) : 5,
    plinkoRiggedBucket:      data.plinko_rigged_bucket,
    globalRigOutcome:        data.global_rig_outcome as 'win' | 'lose' | null,
    sandboxPaymentMode:      data.sandbox_payment_mode,
    bannedUsers:             data.banned_users ?? [],
    frozenUsers:             data.frozen_users ?? [],
    totalDeposits:           parseFloat(data.total_deposits),
    totalWithdrawals:        parseFloat(data.total_withdrawals),
    activeUsersCount:        data.active_users_count,
    simulatedGrowth:         parseFloat(data.simulated_growth),
  };
}

export async function updateAdminConfig(patch: Partial<AdminConfigDTO>): Promise<AdminConfigDTO> {
  const supabase = getAdminClient();

  const updateRow: Record<string, any> = { updated_at: new Date().toISOString() };

  if (patch.crashHouseEdge      !== undefined) updateRow.crash_house_edge       = Math.max(0, Math.min(100, patch.crashHouseEdge));
  if (patch.crashMaxMultiplier  !== undefined) updateRow.crash_max_multiplier   = Math.max(1, Math.min(1000, patch.crashMaxMultiplier));
  if (patch.minesHouseEdge      !== undefined) updateRow.mines_house_edge       = Math.max(0, Math.min(100, patch.minesHouseEdge));
  if (patch.isRigged            !== undefined) updateRow.is_rigged              = !!patch.isRigged;
  if (patch.nextCrashMultiplier !== undefined) updateRow.next_crash_multiplier  = patch.nextCrashMultiplier;
  if (patch.isMinesRiggedNextClick !== undefined) updateRow.mines_rigged_next_click = patch.isMinesRiggedNextClick;
  if (patch.plinkoHouseEdge     !== undefined) updateRow.plinko_house_edge      = Math.max(0, Math.min(100, patch.plinkoHouseEdge));
  if (patch.plinkoRiggedBucket  !== undefined) updateRow.plinko_rigged_bucket   = patch.plinkoRiggedBucket;
  if (patch.globalRigOutcome    !== undefined) updateRow.global_rig_outcome     = patch.globalRigOutcome;
  if (patch.sandboxPaymentMode  !== undefined) updateRow.sandbox_payment_mode   = !!patch.sandboxPaymentMode;
  if (patch.bannedUsers         !== undefined) updateRow.banned_users           = patch.bannedUsers.filter((u) => typeof u === 'string').slice(0, 500);
  if (patch.frozenUsers         !== undefined) updateRow.frozen_users           = patch.frozenUsers.filter((u) => typeof u === 'string').slice(0, 500);
  if (patch.totalDeposits       !== undefined) updateRow.total_deposits         = patch.totalDeposits;
  if (patch.totalWithdrawals    !== undefined) updateRow.total_withdrawals      = patch.totalWithdrawals;
  if (patch.activeUsersCount    !== undefined) updateRow.active_users_count     = patch.activeUsersCount;
  if (patch.simulatedGrowth     !== undefined) updateRow.simulated_growth       = patch.simulatedGrowth;

  await supabase.from('admin_config').update(updateRow).eq('id', 1);
  return getAdminConfig();
}

export async function getAdminStats(): Promise<{ 
  totalDeposits: number, 
  totalWithdrawals: number, 
  activeUsersCount: number, 
  simulatedGrowth: number, 
  usersList: any[],
  totalPlayerBalances: number,
  netCashFloat: number,
  houseProfitDeficit: number,
  coverageRatio: number,
  pendingTransfers: any[]
}> {
  const supabase = getAdminClient();
  
  // Get all active users
  const { data: usersData, count: activeUsersCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact' });

  // Get all pending manual bank transfers
  const { data: pendingTransfers } = await supabase
    .from('transactions')
    .select('*, profiles(username)')
    .in('type', ['deposit', 'withdrawal'])
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  // Get total deposits
  const { data: deposits } = await supabase
    .from('transactions')
    .select('amount')
    .eq('type', 'deposit')
    .eq('status', 'successful');
    
  // Get total withdrawals
  const { data: withdrawals } = await supabase
    .from('transactions')
    .select('amount')
    .eq('type', 'withdrawal')
    .eq('status', 'successful');

  const totalDeposits = deposits?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;
  const totalWithdrawals = withdrawals?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;
  
  // Calculate simulated growth
  const simulatedGrowth = totalDeposits > 0 ? 15.4 : 0; 

  // Standard Liquidity and Float Suite calculations
  const totalPlayerBalances = usersData?.reduce((sum, u) => sum + Number(u.balance || 0), 0) || 0;
  const netCashFloat = totalDeposits - totalWithdrawals;
  const houseProfitDeficit = netCashFloat - totalPlayerBalances;
  const coverageRatio = totalPlayerBalances > 0 ? (netCashFloat / totalPlayerBalances) * 100 : 100;

  return {
    totalDeposits,
    totalWithdrawals,
    activeUsersCount: activeUsersCount || 0,
    simulatedGrowth,
    usersList: usersData || [],
    totalPlayerBalances,
    netCashFloat,
    houseProfitDeficit,
    coverageRatio,
    pendingTransfers: pendingTransfers || []
  };
}

