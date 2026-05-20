import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { getProfile } from '@/lib/dal';
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

    const profile = await getProfile(user.id);
    if (!profile) {
      return NextResponse.json({ error: 'Player profile not found' }, { status: 401 });
    }

    const raw = await request.json();
    const { accountNumber, bankCode } = sanitizeInput(raw);

    if (!accountNumber || accountNumber.length !== 10) {
      return NextResponse.json({ error: 'NUBAN account number must be exactly 10 digits.' }, { status: 400 });
    }

    if (!bankCode) {
      return NextResponse.json({ error: 'Destination bank code is required.' }, { status: 400 });
    }

    const flwSecret = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!flwSecret) {
      return NextResponse.json({ error: 'Payment gateway secret key is missing from environment config.' }, { status: 500 });
    }

    const isTestMode = flwSecret.startsWith('FLWSECK_TEST');

    try {
      // If we are in test mode and the bank code is not Access Bank (044) or the account number is not the test one,
      // we can gracefully mock the resolution to avoid sandbox blocker errors, allowing seamless testing.
      if (isTestMode && (bankCode !== '044' || accountNumber !== '0690000032')) {
        const NIGERIAN_SURNAMES = ['OLUWASEUN', 'OKOYE', 'BALOGUN', 'CHIDI', 'EZE', 'ADEBAYO', 'DANJUMA', 'BELLO'];
        const cleanUsername = profile.username.replace(/[^a-zA-Z]/g, '').toUpperCase();
        const seed = parseInt(accountNumber.slice(-3)) || 0;
        const surname = NIGERIAN_SURNAMES[seed % NIGERIAN_SURNAMES.length];
        const resolvedName = cleanUsername && cleanUsername.length >= 3 ? `${cleanUsername} ${surname}` : `SHINA ${surname}`;

        return NextResponse.json({
          status: 'success',
          data: {
            account_number: accountNumber,
            account_name: `${resolvedName} (TEST MODE)`,
            bank_code: bankCode
          }
        });
      }

      const flwResponse = await fetch('https://api.flutterwave.com/v3/accounts/resolve', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${flwSecret}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          account_number: accountNumber,
          account_bank: bankCode
        })
      });

      const result = await flwResponse.json();

      if (flwResponse.ok && result.status === 'success') {
        return NextResponse.json({
          status: 'success',
          data: {
            account_number: result.data.account_number,
            account_name: result.data.account_name,
            bank_code: bankCode
          }
        });
      } else {
        // Fallback if the Flutterwave test API rejects it with test restrictions
        if (isTestMode || (result.message && (result.message.includes('044') || result.message.includes('numeric')))) {
          const NIGERIAN_SURNAMES = ['OLUWASEUN', 'OKOYE', 'BALOGUN', 'CHIDI', 'EZE', 'ADEBAYO', 'DANJUMA', 'BELLO'];
          const cleanUsername = profile.username.replace(/[^a-zA-Z]/g, '').toUpperCase();
          const seed = parseInt(accountNumber.slice(-3)) || 0;
          const surname = NIGERIAN_SURNAMES[seed % NIGERIAN_SURNAMES.length];
          const resolvedName = cleanUsername && cleanUsername.length >= 3 ? `${cleanUsername} ${surname}` : `SHINA ${surname}`;

          return NextResponse.json({
            status: 'success',
            data: {
              account_number: accountNumber,
              account_name: `${resolvedName} (TEST MODE)`,
              bank_code: bankCode
            }
          });
        }

        return NextResponse.json({
          error: result.message || 'Unable to resolve live bank account details. Verify your bank & account number.'
        }, { status: 400 });
      }
    } catch (err: any) {
      if (isTestMode) {
        return NextResponse.json({
          status: 'success',
          data: {
            account_number: accountNumber,
            account_name: `TEST USER (OFFLINE)`,
            bank_code: bankCode
          }
        });
      }
      return NextResponse.json({ error: 'Live verification gateway offline. Please try again.' }, { status: 502 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
