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

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      return NextResponse.json({ error: 'Paystack is not configured in environment variables.' }, { status: 500 });
    }

    const paystackUrl = `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`;
    const paystackResponse = await fetch(paystackUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await paystackResponse.json();

    if (paystackResponse.ok && result.status === true) {
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
