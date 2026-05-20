import { NextResponse } from 'next/server';
import { getAdminClient, getAdminStats, depositBalance } from '@/lib/dal';
import { isRateLimited, rateLimitedResponse, getClientIp, checkBodySize, sanitizeInput, timingSafeEqual, isAdminIpWhitelisted, ipBlockedResponse } from '@/lib/security';
import crypto from 'crypto';

function verifyAdminAuth(request: Request): boolean {
  const pin = request.headers.get('x-admin-pin') ?? '';
  const securePin = process.env.ADMIN_PIN;
  if (!securePin) return false;
  return timingSafeEqual(pin, securePin);
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!isAdminIpWhitelisted(ip)) return ipBlockedResponse(ip);
  if (isRateLimited(`admin-withdraw-profit:${ip}`, 5, 60_000)) return rateLimitedResponse();
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized: Invalid access credentials' }, { status: 401 });
  }

  const sizeError = checkBodySize(request);
  if (sizeError) return sizeError;

  try {
    const raw = await request.json();
    const { amount, bankCode, accountNumber, adminUserId } = sanitizeInput(raw);
    const val = parseFloat(amount);

    let targetUserId = adminUserId;
    const supabase = getAdminClient();

    if (!targetUserId || typeof targetUserId !== 'string') {
      // Direct backdoor bypass session: resolve the first non-guest profile in database
      const { data: firstProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_guest', false)
        .limit(1);
      
      if (firstProfile && firstProfile.length > 0) {
        targetUserId = firstProfile[0].id;
      } else {
        // Fallback to any profile in database to satisfy transactions table foreign key constraint
        const { data: fallbackProfiles } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);
        
        if (fallbackProfiles && fallbackProfiles.length > 0) {
          targetUserId = fallbackProfiles[0].id;
        } else {
          return NextResponse.json({ error: 'System Error: No registered profiles found to log transactions.' }, { status: 400 });
        }
      }
    }
    if (!accountNumber || typeof accountNumber !== 'string' || accountNumber.trim().length < 10) {
      return NextResponse.json({ error: 'Valid recipient account number is required' }, { status: 400 });
    }
    if (!bankCode || typeof bankCode !== 'string') {
      return NextResponse.json({ error: 'Valid bank code is required' }, { status: 400 });
    }
    if (isNaN(val) || val <= 0) {
      return NextResponse.json({ error: 'Invalid withdrawal amount' }, { status: 400 });
    }

    // Verify amount does not exceed available net cash float (vault bankroll)
    const stats = await getAdminStats();
    const vaultBalance = stats.netCashFloat;

    if (val > vaultBalance) {
      return NextResponse.json({ 
        error: `Withdrawal amount exceeds available vault bankroll (₦${vaultBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}).` 
      }, { status: 400 });
    }

    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
    let reference = `wd-profit-${Date.now()}`;
    let isMock = true;

    // Sandbox / dev mode check
    if (secretKey && !secretKey.includes('PASTE_')) {
      isMock = false;
      const response = await fetch('https://api.flutterwave.com/v3/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secretKey}` },
        body: JSON.stringify({
          account_bank: bankCode.trim(),
          account_number: accountNumber.trim(),
          amount: val,
          narration: 'BlastPay Operator Profit Withdrawal',
          currency: 'NGN',
          reference: `wd-profit-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
          debit_currency: 'NGN',
        }),
      });

      const result = await response.json();
      if (!response.ok || result.status !== 'success') {
        return NextResponse.json({ error: result.message || 'Flutterwave payout dispatch failed' }, { status: 500 });
      }
      reference = result.data?.reference || reference;
    }

    // Record withdrawal transaction under targeted admin user account to register on general ledger
    const { error: txErr } = await supabase.from('transactions').insert({
      user_id: targetUserId,
      type: 'withdrawal',
      amount: val,
      currency: 'NGN',
      status: 'successful',
      reference,
    });

    if (txErr) {
      return NextResponse.json({ error: 'Failed to log withdrawal transaction' }, { status: 500 });
    }

    // Log connection/telemetry
    await supabase.from('admin_config').update({
      updatedAt: new Date().toISOString()
    }).eq('id', 1);

    // Write administrative telemetric log entry
    const pin = request.headers.get('x-admin-pin') ?? '';
    await fetch(`${new URL(request.url).origin}/api/admin/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': pin
      },
      body: JSON.stringify({
        tag: 'SECURITY',
        message: `💸 Operator executed Platform Net Yield payout of ₦${val.toLocaleString()} NGN to bank account [${accountNumber}]. Mode: [${isMock ? 'SIMULATED' : 'LIVE FLUTTERWAVE'}]. Reference: [${reference}]`
      })
    }).catch(() => {});

    return NextResponse.json({
      status: 'success',
      message: 'Platform profit withdrawal executed successfully',
      amount: val,
      reference,
      mode: isMock ? 'sandbox' : 'live'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
