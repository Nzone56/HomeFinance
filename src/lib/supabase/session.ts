import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabaseEnv } from "./env";

export const LOGIN_PATH = "/login";
export const DEFAULT_AUTHENTICATED_PATH = "/dashboard";

/** The only route reachable without a session. */
const PUBLIC_PATHS = new Set<string>([LOGIN_PATH]);

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}

/**
 * Refreshes the Supabase session cookie and keeps signed-out visitors out of
 * the application.
 *
 * This is a convenience layer, not the security boundary — Row Level Security
 * is. It exists so an expired session is renewed before a Server Component
 * runs, and so an unauthenticated visitor lands on the login screen instead of
 * an empty dashboard.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const env = supabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getClaims verifies the access token's signature against the project's
  // signing keys (ES256), which auth-js caches process-wide, and refreshes an
  // expired session first. getSession would trust whatever the cookie claims;
  // getUser made a round trip to Supabase Auth on every request — prefetches
  // included — and that round trip was most of the proxy's 400–500ms.
  const { data } = await supabase.auth.getClaims();
  const signedIn = data !== null;

  const { pathname } = request.nextUrl;

  if (!signedIn && !isPublicPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = LOGIN_PATH;
    return NextResponse.redirect(redirectUrl);
  }

  if (signedIn && isPublicPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = DEFAULT_AUTHENTICATED_PATH;
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
