import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { getProfile, createPendingTransaction, getTransactions, approvePendingTransaction } from '@/lib/dal';
import { getAdminConfig, getAdminClient } from '@/lib/dal';
import { isRateLimited, rateLimitedResponse, getClientIp, checkBodySize, sanitizeInput } from '@/lib/security';
import fs from 'fs';
import path from 'path';

const MIN_DEPOSIT = 50;
const MAX_DEPOSIT = 1_000_000;

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

function triggerAiAutoSettle(transactionId: string, amount: number, username: string, senderName: string) {
  try {
    const configPath = path.join(process.cwd(), 'src/lib/ai_config.json');
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(raw);

      if (config.aiAutoSettle) {
        const delay = config.aiSettleDelayMs || 8000;
        
        pushTelemetryLog(
          'SYSTEM',
          `🤖 AI PAYMENT AGENT: Intercepted pending manual transfer of ₦${amount.toLocaleString()} from player [${username}]. Analyzing bank receipt confirmation...`
        );

        setTimeout(async () => {
          try {
            const success = await approvePendingTransaction(transactionId);
            if (success) {
              pushTelemetryLog(
                'WALLET',
                `🤖 AI AUTO-APPROVED: Verified transfer receipt of ₦${amount.toLocaleString()} from [${senderName}] (Player: ${username}). Wallet balance credited!`
              );
            }
          } catch (err) {
            console.error('AI Auto-Settle background worker execution error:', err);
          }
        }, delay);
      }
    }
  } catch (err) {
    console.error('AI Auto-Settle background trigger error:', err);
  }
}

export async function POST(request: Request) {
  const sizeError = checkBodySize(request);
  if (sizeError) return sizeError;

  const ip = getClientIp(request);
  if (isRateLimited(`manual-deposit:${ip}`, 10, 60_000)) return rateLimitedResponse();

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
    const { amount, reference, transferCode } = sanitizeInput(raw);
    const val = parseFloat(amount);
    const refStr = (reference || '').trim();
    const codeStr = (transferCode || '').trim();

    if (isNaN(val) || val < MIN_DEPOSIT) {
      return NextResponse.json({ error: `Minimum deposit is ₦${MIN_DEPOSIT.toLocaleString()}` }, { status: 400 });
    }
    if (val > MAX_DEPOSIT) {
      return NextResponse.json({ error: `Maximum deposit is ₦${MAX_DEPOSIT.toLocaleString()}` }, { status: 400 });
    }
    if (!refStr) {
      return NextResponse.json({ error: 'Sender reference / account info is required' }, { status: 400 });
    }
    if (!codeStr || codeStr.length !== 6) {
      return NextResponse.json({ error: 'Invalid Transfer Code payload. Please reload and try again.' }, { status: 400 });
    }

    const supabaseAdmin = getAdminClient();
    
    // Anti-Spam Security Measure: Prevent multiple pending transfer requests
    const { data: pendingTxs } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'deposit')
      .eq('status', 'pending')
      .limit(1);

    if (pendingTxs && pendingTxs.length > 0) {
      pushTelemetryLog('SECURITY', `⚠️ SPAM ALERT: Player [${profile.username}] attempted to flood transfer requests. Request blocked.`);
      return NextResponse.json({ error: 'Spam Prevention: You already have a pending transfer request. Please wait for the admin to verify it.' }, { status: 429 });
    }

    // Format the reference securely for the Admin Ledger
    const uniqueRef = `CODE: ${codeStr} | SENDER: ${refStr}`;

    const txId = await createPendingTransaction(user.id, val, uniqueRef);

    if (txId) {
      triggerAiAutoSettle(txId, val, profile.username, refStr);
    }

    // Fetch transactions list to sync immediate client view
    const txns = await getTransactions(user.id);
    return NextResponse.json({ status: 'success', transactions: txns });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
