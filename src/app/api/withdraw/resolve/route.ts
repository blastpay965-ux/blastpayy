import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { isRateLimited, rateLimitedResponse, getClientIp, checkBodySize, sanitizeInput } from '@/lib/security';

export async function POST(request: Request) {
  const sizeError = checkBodySize(request);
  if (sizeError) return sizeError;

  const ip = getClientIp(request);
  if (isRateLimited(`resolve-payout:${ip}`, 20, 60_000)) return rateLimitedResponse();

  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const raw = await request.json();
    const { accountNumber, bankCode } = sanitizeInput(raw);

    if (!accountNumber || !/^\d{10}$/.test(accountNumber)) {
      return NextResponse.json({ error: 'Account number must be exactly 10 digits.' }, { status: 400 });
    }

    if (!bankCode) {
      return NextResponse.json({ error: 'Please select a destination bank.' }, { status: 400 });
    }

    const flwSecret = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!flwSecret) {
      return NextResponse.json({ error: 'Payment gateway is not configured.' }, { status: 500 });
    }

    const flwResponse = await fetch('https://api.flutterwave.com/v3/accounts/resolve', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${flwSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account_number: accountNumber,
        account_bank: bankCode,
      }),
    });

    const result = await flwResponse.json();

    if (flwResponse.ok && result.status === 'success') {
      return NextResponse.json({
        status: 'success',
        data: {
          account_number: result.data.account_number,
          account_name: result.data.account_name,
          bank_code: bankCode,
        },
      });
    }

    return NextResponse.json(
      { error: result.message || 'Could not verify the account number. Please check the bank and account number.' },
      { status: 400 }
    );

  } catch (err: any) {
    return NextResponse.json(
      { error: 'Account verification is currently unavailable. Please try again shortly.' },
      { status: 502 }
    );
  }
}
