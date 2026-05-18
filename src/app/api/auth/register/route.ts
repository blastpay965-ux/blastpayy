import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createSupabaseAdmin } from '@/lib/supabase-server';
import { createProfile, getProfileByUsername, depositBalance } from '@/lib/dal';
import { isRateLimited, rateLimitedResponse, getClientIp, checkBodySize, sanitizeInput, validatePassword, validateUsername } from '@/lib/security';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const referralCode = searchParams.get('checkReferral');
  if (!referralCode) {
    return NextResponse.json({ error: 'Missing checkReferral parameter' }, { status: 400 });
  }

  const profile = await getProfileByUsername(referralCode);
  if (!profile) {
    return NextResponse.json({ error: 'Referral code (username) not found' }, { status: 404 });
  }

  return NextResponse.json({ status: 'valid' });
}

export async function POST(request: NextRequest) {
  const sizeError = checkBodySize(request);
  if (sizeError) return sizeError;

  const ip = getClientIp(request);
  if (isRateLimited(`register:${ip}`, 50, 10 * 60_000)) return rateLimitedResponse();

  try {
    const raw = await request.json();
    let { username, password, contact, referralCode } = sanitizeInput(raw);

    // Normalize phone numbers to remove spaces/dashes
    if (contact && !contact.includes('@')) {
      contact = contact.replace(/[\s-]/g, '');
    }

    const usernameError = validateUsername(username);
    if (usernameError) return NextResponse.json({ error: usernameError }, { status: 400 });

    const passwordError = validatePassword(password);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

    const existing = await getProfileByUsername(username);
    if (existing) return NextResponse.json({ error: 'Username is already taken' }, { status: 400 });

    let referringProfile = null;
    if (referralCode) {
      referringProfile = await getProfileByUsername(referralCode);
      if (!referringProfile) {
        return NextResponse.json({ error: 'Referral code not found. Please clear or check the code.' }, { status: 400 });
      }
      if (referringProfile.username.toLowerCase() === username.toLowerCase()) {
        return NextResponse.json({ error: 'You cannot refer yourself.' }, { status: 400 });
      }
    }

    const adminSupabase = await createSupabaseAdmin();
    const email = contact?.includes('@') ? contact.trim() : `${username.trim().toLowerCase()}@blastpay-internal.com`;

    // Create Supabase Auth user using the Admin client to bypass strict IP rate limits
    const { data, error } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username: username.trim() },
    });

    if (error || !data.user) {
      return NextResponse.json({ error: error?.message || 'Registration failed' }, { status: 400 });
    }

    // ────────────────────────────────────────────────────────────────────────
    // THE FIX: Wire the Supabase browser client to write cookies onto a
    // staging response, then copy them to the final response. This ensures
    // the session cookie actually reaches the browser after registration.
    // ────────────────────────────────────────────────────────────────────────
    const stagingResponse = NextResponse.json({ status: 'pending' });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              stagingResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // Sign in immediately to generate session cookies for the new user
    await supabase.auth.signInWithPassword({ email, password });

    // Insert profile row
    const profile = await createProfile(data.user.id, username, contact || '', false);

    // Apply referral bonus if applicable
    if (referringProfile) {
      await depositBalance(referringProfile.id, 1000);
      await depositBalance(profile.id, 1000);
    }

    // Build the final response and copy all session cookies onto it
    const finalResponse = NextResponse.json({
      status: 'success',
      user: { username: profile.username, accountNumber: profile.accountNumber, isGuest: false },
    });
    stagingResponse.cookies.getAll().forEach(({ name, value, ...rest }) =>
      finalResponse.cookies.set(name, value, rest as any)
    );
    return finalResponse;

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
