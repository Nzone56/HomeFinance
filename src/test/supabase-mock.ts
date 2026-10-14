import type { PostgrestError } from "@supabase/supabase-js";
import { vi } from "vitest";

import type { AppSupabaseClient } from "@/lib/actions/mutate";

/**
 * A hand-rolled Supabase double.
 *
 * PostgREST's builder is chainable and thenable, so the double is too: every
 * filter returns `this`, and awaiting it yields the canned result. Each call is
 * recorded, which is what lets the action tests assert the thing that actually
 * matters — that a write carries the household resolved on the server, not one
 * taken from the submitted form.
 */

export interface RecordedQuery {
  table: string;
  operation: "select" | "insert" | "update" | "upsert" | "delete";
  values?: unknown;
  upsertOptions?: unknown;
  filters: [string, unknown][];
}

interface QueryResult {
  data: unknown;
  error: PostgrestError | null;
}

export function postgrestError(message = "permission denied"): PostgrestError {
  const fields = {
    name: "PostgrestError",
    message,
    details: "",
    hint: "",
    code: "42501",
  };
  return { ...fields, toJSON: () => fields };
}

class MockQueryBuilder implements PromiseLike<QueryResult> {
  constructor(
    private readonly record: RecordedQuery,
    private readonly rows: unknown[],
    private readonly error: PostgrestError | null,
  ) {}

  private capture(
    operation: RecordedQuery["operation"],
    values?: unknown,
    upsertOptions?: unknown,
  ) {
    this.record.operation = operation;
    if (values !== undefined) {
      this.record.values = values;
    }
    if (upsertOptions !== undefined) {
      this.record.upsertOptions = upsertOptions;
    }
    return this;
  }

  select() {
    return this.capture("select");
  }

  insert(values: unknown) {
    return this.capture("insert", values);
  }

  update(values: unknown) {
    return this.capture("update", values);
  }

  upsert(values: unknown, options?: unknown) {
    return this.capture("upsert", values, options);
  }

  delete() {
    return this.capture("delete");
  }

  order() {
    return this;
  }

  limit() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.record.filters.push([column, value]);
    return this;
  }

  lte(column: string, value: unknown) {
    this.record.filters.push([column, value]);
    return this;
  }

  gte(column: string, value: unknown) {
    this.record.filters.push([column, value]);
    return this;
  }

  /** Resolves to the first row, matching PostgREST's own behaviour. */
  maybeSingle(): PromiseLike<QueryResult> {
    return Promise.resolve({
      data: this.error === null ? (this.rows.at(0) ?? null) : null,
      error: this.error,
    });
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    const result: QueryResult =
      this.error === null ? { data: this.rows, error: null } : { data: null, error: this.error };
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }
}

export interface SupabaseMockOptions {
  /** `null` means nobody is signed in. */
  user?: { id: string } | null;
  /** Rows each table should return, keyed by table name. */
  tables?: Record<string, unknown[]>;
  /** When set, every query fails with this error. */
  error?: PostgrestError | null;
  signInError?: { message: string } | null;
}

export interface SupabaseMock {
  client: AppSupabaseClient;
  queries: RecordedQuery[];
  signInWithPassword: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
  /** The most recent query recorded against a table. */
  queryFor: (table: string) => RecordedQuery | undefined;
}

export function createSupabaseMock(options: SupabaseMockOptions = {}): SupabaseMock {
  const { user = { id: "user-julian" }, tables = {}, error = null, signInError = null } = options;
  const queries: RecordedQuery[] = [];

  const signInWithPassword = vi.fn(async () => ({ data: {}, error: signInError }));
  const signOut = vi.fn(async () => ({ error: null }));

  const client = {
    from(table: string) {
      const record: RecordedQuery = { table, operation: "select", filters: [] };
      queries.push(record);
      return new MockQueryBuilder(record, tables[table] ?? [], error);
    },
    auth: {
      getClaims: vi.fn(async () => ({
        data: user === null ? null : { claims: { sub: user.id } },
        error: null,
      })),
      signInWithPassword,
      signOut,
    },
  } as unknown as AppSupabaseClient;

  return {
    client,
    queries,
    signInWithPassword,
    signOut,
    queryFor: (table) => queries.filter((query) => query.table === table).at(-1),
  };
}
