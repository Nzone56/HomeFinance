import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/session";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /**
     * Everything except Next's own assets and the PWA files, which must stay
     * reachable while signed out so the app can install and show its icon.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
