import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Thrown when Supabase rejects a query. Server Components let it reach the
 * nearest error boundary rather than rendering half a dashboard.
 */
export class DataAccessError extends Error {
  constructor(operation: string, detail: string) {
    super(`${operation}: ${detail}`);
    this.name = "DataAccessError";
  }
}

interface PostgrestResult<T> {
  data: T | null;
  error: PostgrestError | null;
}

/** Rebuilds the query: a PostgREST builder resolves once and cannot be reused. */
type QueryFactory<T> = () => PromiseLike<PostgrestResult<T>>;

/**
 * Failures from the REST gateway rather than from Postgres itself.
 *
 * Matched on the message because a gateway error never carries a SQLSTATE —
 * `permission denied` (42501) and friends come back with a code and must never
 * be retried. Retrying one of those would be a slower way to fail.
 */
const TRANSIENT_MESSAGES = ["gateway timeout", "service unavailable", "fetch failed"];

function isTransient(error: PostgrestError): boolean {
  const message = error.message.toLowerCase();
  return TRANSIENT_MESSAGES.some((candidate) => message.includes(candidate));
}

/**
 * Runs a read, giving it one more go if the gateway — not the database — was
 * what failed.
 *
 * Supabase's REST layer intermittently times out a request that Postgres
 * answered in milliseconds. One retry turns that from an error screen into a
 * slightly slower page. Reads only, and exactly once: a write must never be
 * replayed, and a second failure is a real outage worth showing.
 */
export const RETRY_DELAYS_MS = [250, 750];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function retryTransient<T>(factory: QueryFactory<T>): Promise<PostgrestResult<T>> {
  let result = await factory();
  for (const delay of RETRY_DELAYS_MS) {
    if (result.error === null || !isTransient(result.error)) {
      return result;
    }
    await wait(delay);
    result = await factory();
  }
  return result;
}

/**
 * A list query. A filtered-out result is an empty list, never an error: Row
 * Level Security returning no rows means "not yours", which reads the same as
 * "none recorded" from the application's point of view.
 */
export function unwrapRows<T>(operation: string, result: PostgrestResult<T[]>): T[] {
  if (result.error !== null) {
    throw new DataAccessError(operation, result.error.message);
  }
  return result.data ?? [];
}

/** A single-row query that is allowed to match nothing. */
export function unwrapMaybeRow<T>(operation: string, result: PostgrestResult<T>): T | null {
  if (result.error !== null) {
    throw new DataAccessError(operation, result.error.message);
  }
  return result.data;
}

/** `unwrapRows`, with the transient retry in front of it. */
export async function rowsOf<T>(operation: string, factory: QueryFactory<T[]>): Promise<T[]> {
  return unwrapRows(operation, await retryTransient(factory));
}

/** `unwrapMaybeRow`, with the transient retry in front of it. */
export async function maybeRowOf<T>(
  operation: string,
  factory: QueryFactory<T>,
): Promise<T | null> {
  return unwrapMaybeRow(operation, await retryTransient(factory));
}
