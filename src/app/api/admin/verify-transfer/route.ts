import { NextResponse } from 'next/server';
import { getAdminClient, approvePendingTransaction, rejectPendingTransaction } from '@/lib/dal';
import { isRateLimited, rateLimitedResponse, getClientIp, checkBodySize, sanitizeInput, timingSafeEqual, isAdminIpWhitelisted, ipBlockedResponse } from '@/lib/security';

interface LogItem {
  id: string;
  timestamp: string;
  tag: 'GAMEPLAY' | 'WALLET' | 'SUPPORT' | 'SYSTEM' | 'SECURITY';
  message: string;
}

const globalForLogs = global as unknown as { systemLogs: LogItem[] };

function verifyAdminAuth(request: Request): boolean {
  const pin = request.headers.get('x-admin-pin') ?? '';
  const securePin = process.env.ADMIN_PIN;
  if (!securePin) return false;
  return timingSafeEqual(pin, securePin);
}

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

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!isAdminIpWhitelisted(ip)) return ipBlockedResponse(ip);
  if (isRateLimited(`admin-verify-transfer:${ip}`, 30, 60_000)) return rateLimitedResponse();

  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized: Invalid access credentials' }, { status: 401 });
  }

  const sizeError = checkBodySize(request);
  if (sizeError) return sizeError;

  try {
    const raw = await request.json();
    const { transactionId, action } = sanitizeInput(raw);

    if (!transactionId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid payload parameters' }, { status: 400 });
    }

    const supabase = getAdminClient();
    const { data: tx, error: txErr } = await supabase
      .from('transactions')
      .select('*, profiles(username)')
      .eq('id', transactionId)
      .single();

    if (txErr || !tx) {
      return NextResponse.json({ error: 'Target transaction record not found' }, { status: 404 });
    }

    if (tx.status !== 'pending') {
      return NextResponse.json({ error: `Transaction is already resolved as: ${tx.status}` }, { status: 400 });
    }

    const username = (tx.profiles as any)?.username || 'Unknown';
    let success = false;

    if (action === 'approve') {
      success = await approvePendingTransaction(transactionId);
      if (success) {
        pushTelemetryLog(
          'WALLET',
          `💰 MANUAL BANK TRANSFER APPROVED: User [${username}] credited with ₦${parseFloat(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
        );
      }
    } else {
      success = await rejectPendingTransaction(transactionId);
      if (success) {
        pushTelemetryLog(
          'WALLET',
          `⚠️ MANUAL BANK TRANSFER REJECTED: Deposit request of ₦${parseFloat(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} by User [${username}] was declined.`
        );
      }
    }

    if (!success) {
      return NextResponse.json({ error: 'Transaction resolution failed to execute' }, { status: 500 });
    }

    return NextResponse.json({ status: 'success' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
