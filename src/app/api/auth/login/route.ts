import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getProfile, createProfile } from '@/lib/dal';
import { getAdminConfig } from '@/lib/dal';
import { isRateLimited, rateLimitedResponse, getClientIp, checkBodySize, sanitizeInput } from '@/lib/security';

export async function POST(request: NextRequest) {
  const sizeError = checkBodySize(request);
  if (sizeError) return sizeError;

  const ip = getClientIp(request);
  if (isRateLimited(`login:${ip}`, 10, 60_000)) return rateLimitedResponse();

  try {
    const raw = await request.json();
    const { username, password, email, isGuest } = sanitizeInput(raw);

    const config = await getAdminConfig();

    // ────────────────────────────────────────────────────────────────────────
    // THE FIX: We create a "staging" response object first, then wire the
    // Supabase client to write cookies directly onto it via `setAll`.
    // This is the only pattern that guarantees cookies are sent to the
    // browser in a Next.js Route Handler using @supabase/ssr.
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

    // Helper to copy staged cookies onto the final response
    const withCookies = (res: NextResponse) => {
      stagingResponse.cookies.getAll().forEach(({ name, value, ...rest }) =>
        res.cookies.set(name, value, rest as any)
      );
      return res;
    };

    if (isGuest) {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error || !data.user) {
        return NextResponse.json({ error: 'Guest session failed' }, { status: 400 });
      }
      const guestName = `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
      const profile = await createProfile(data.user.id, guestName, 'GUEST', true);
      return withCookies(NextResponse.json({
        status: 'success',
        user: { username: profile.username, accountNumber: profile.accountNumber, isGuest: true },
      }));
    }

    if (!email && !username) {
      return NextResponse.json({ error: 'Email or username is required' }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const loginKey = email || username;
    if (isRateLimited(`login-user:${loginKey?.toLowerCase()}`, 10, 60_000)) {
      return NextResponse.json({ error: 'Too many login attempts. Please wait 60 seconds.' }, { status: 429 });
    }

    // Derive email from username (must match how we stored it on register)
    let loginEmail = email?.trim() || `${username?.trim().toLowerCase()}@blastpay-internal.com`;

    if (username && !email) {
      const normalizedContact = username.includes('@') ? username.trim() : username.replace(/\s+/g, '').trim();
      const { data: profileByContact } = await supabase
        .from('profiles')
        .select('username, contact')
        .eq('contact', normalizedContact)
        .single();

      if (profileByContact) {
        if (profileByContact.contact?.includes('@')) {
          loginEmail = profileByContact.contact;
        } else {
          loginEmail = `${profileByContact.username.toLowerCase()}@blastpay-internal.com`;
        }
      } else if (username.includes('@')) {
        loginEmail = username.trim();
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    let profile = await getProfile(data.user.id);
    if (!profile) {
      profile = await createProfile(data.user.id, username || loginEmail, loginEmail, false);
    }

    if (config.bannedUsers.includes(profile.username)) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: 'Access Denied: This account has been suspended.' }, { status: 403 });
    }

    return withCookies(NextResponse.json({
      status: 'success',
      user: { username: profile.username, accountNumber: profile.accountNumber, isGuest: profile.isGuest },
    }));

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
