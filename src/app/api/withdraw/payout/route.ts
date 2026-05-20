import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { getProfile, createPendingTransaction, getTransactions, deductBalance } from '@/lib/dal';
import { getAdminConfig, getAdminClient } from '@/lib/dal';
import { isRateLimited, rateLimitedResponse, getClientIp, checkBodySize, sanitizeInput } from '@/lib/security';

const MIN_WITHDRAWAL = 100;
const MAX_WITHDRAWAL = 500_000;

interface LogItem {
  id: string;
  timestamp: string;
  tag: 'GAMEPLAY' | 'WALLET' | 'SUPPORT' | 'SYSTEM' | 'SECURITY';
  message: string;
}

const globalForLogs = global as unknown as { systemLogs: LogItem[] };

function pushTelemetryLog(tag: 'GAMEPLAY' | 'WALLET' | 'SUPPORT' | 'SYSTEM' | 'SECURITY', message: string) {
  if (!globalForLogs.systemLogs) {
    globalForLogs.systemLogs = [];
  }
  const newLog: LogItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toLocaleTimeString(),
    tag,
    message,
  };
  globalForLogs.systemLogs.unshift(newLog);
  if (globalForLogs.systemLogs.length > 200) {
    globalForLogs.systemLogs.pop();
  }
}

// Maps bank codes to beautiful names
const BANK_MAP: Record<string, string> = {
  '058': 'Guaranty Trust Bank (GTBank)',
  '057': 'Zenith Bank',
  '999111': 'Kuda Bank',
  '999262': 'OPay',
  '044': 'Access Bank',
  '033': 'United Bank for Africa (UBA)',
  '011': 'First Bank of Nigeria',
  '050': 'Ecobank',
};

export async function POST(request: Request) {
  const sizeError = checkBodySize(request);
  if (sizeError) return sizeError;

  const ip = getClientIp(request);
  if (isRateLimited(`withdraw-payout:${ip}`, 5, 60_000)) return rateLimitedResponse();

  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [profile, config] = await Promise.all([getProfile(user.id), getAdminConfig()]);
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (config.bannedUsers.includes(profile.username)) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: 'Access Denied: Account suspended' }, { status: 403 });
    }
    if (config.frozenUsers.includes(profile.username)) {
      return NextResponse.json({ error: 'Access Denied: Wallet is locked/frozen' }, { status: 403 });
    }

    const raw = await request.json();
    const { amount, bankCode, accountNumber } = sanitizeInput(raw);
    const val = parseFloat(amount);
    const codeStr = (bankCode || '').trim();
    const acctStr = (accountNumber || '').trim();

    if (isNaN(val) || val < MIN_WITHDRAWAL) {
      return NextResponse.json({ error: `Minimum withdrawal is ₦${MIN_WITHDRAWAL.toLocaleString()}` }, { status: 400 });
    }
    if (val > MAX_WITHDRAWAL) {
      return NextResponse.json({ error: `Maximum withdrawal is ₦${MAX_WITHDRAWAL.toLocaleString()}` }, { status: 400 });
    }
    if (!codeStr || !acctStr) {
      return NextResponse.json({ error: 'Destination Bank and Account Number are required' }, { status: 400 });
    }

    const bankName = BANK_MAP[codeStr] || 'Payout Bank';
    const supabaseAdmin = getAdminClient();
    
    // Anti-Spam Security Measure: Prevent multiple pending withdrawal requests
    const { data: pendingTxs } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'withdrawal')
      .eq('status', 'pending')
      .limit(1);

    if (pendingTxs && pendingTxs.length > 0) {
      pushTelemetryLog('SECURITY', `⚠️ SPAM ALERT: Player [${profile.username}] attempted to flood withdrawal requests.`);
      return NextResponse.json({ error: 'You already have a pending withdrawal request. Please wait for the admin to verify it before requesting another.' }, { status: 429 });
    }

    // Step 1: Deduct balance atomically
    const newBalance = await deductBalance(user.id, val, false);
    
    if (newBalance === null) {
      return NextResponse.json({ error: 'Insufficient wallet balance.' }, { status: 400 });
    }

    // Step 2: Format the reference securely for the Admin Ledger
    const uniqueRef = `BANK: ${bankName} | ACCT: ${acctStr}`;

    // Step 3: Create the Pending Withdrawal Transaction
    const tx = await createPendingTransaction(user.id, val, uniqueRef, 'withdrawal');

    pushTelemetryLog('WALLET', `💸 WITHDRAWAL REQUEST: Player [${profile.username}] requested ₦${val.toLocaleString()} to ${bankName} (${acctStr}). Status: PENDING.`);

    return NextResponse.json({
      status: 'success',
      data: {
        reference: tx || `wd-${Date.now()}`,
        amount: val,
        balance: newBalance
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
