export interface DevLoginCredentials {
  email: string;
  password: string;
}

/**
 * The test account for one-click sign-in while developing.
 *
 * Returns `null` outside `next dev`, and whenever either variable is missing,
 * so a production build never offers the shortcut however it is configured.
 * The values come from `.env.local` and are read only on the server — they are
 * deliberately not `NEXT_PUBLIC_`, so the browser never sees them.
 */
export function devLoginCredentials(): DevLoginCredentials | null {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const email = process.env.DEV_LOGIN_EMAIL;
  const password = process.env.DEV_LOGIN_PASSWORD;

  if (email === undefined || email === "" || password === undefined || password === "") {
    return null;
  }

  return { email, password };
}
