import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * This proxy keeps users logged in by refreshing the Supabase session
 * cookie when it is about to expire.
 *
 * PERFORMANCE NOTE: We use getSession() NOT getUser() here.
 * - getSession() reads the JWT from the cookie locally — 0ms network cost.
 * - getUser() makes a live call to Supabase Auth servers — ~800-1000ms!
 *
 * The matcher excludes /api/* routes so the crash game's 1-second polls
 * and wallet requests don't each pay the proxy overhead cost.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Reads the session from the cookie locally — no network call.
  // Automatically sets a refreshed cookie if the token is near expiry.
  await supabase.auth.getSession();

  return response;
}

export const config = {
  matcher: [
    /*
     * Run ONLY on page navigations, NOT on API routes.
     * Excluding /api/* is critical: the Aviator game polls every second and
     * wallet routes fire on every bet. Running the proxy on those would
     * add latency to every game action.
     */
    '/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
