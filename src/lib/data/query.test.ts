import type { PostgrestError } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  DataAccessError,
  maybeRowOf,
  RETRY_DELAYS_MS,
  rowsOf,
  unwrapMaybeRow,
  unwrapRows,
} from "./query";

const failureFields = {
  name: "PostgrestError",
  message: "permission denied for table expenses",
  details: "",
  hint: "",
  code: "42501",
};
const failure: PostgrestError = { ...failureFields, toJSON: () => failureFields };

describe("unwrapRows", () => {
  it("returns the rows", () => {
    expect(unwrapRows("load", { data: [{ id: "a" }], error: null })).toEqual([{ id: "a" }]);
  });

  it("treats no rows as an empty list", () => {
    expect(unwrapRows("load", { data: null, error: null })).toEqual([]);
    expect(unwrapRows("load", { data: [], error: null })).toEqual([]);
  });

  it("throws with the operation and the database message", () => {
    expect(() => unwrapRows("load expenses", { data: null, error: failure })).toThrow(
      DataAccessError,
    );
    expect(() => unwrapRows("load expenses", { data: null, error: failure })).toThrow(
      "load expenses: permission denied for table expenses",
    );
  });
});

describe("unwrapMaybeRow", () => {
  it("returns the row", () => {
    expect(unwrapMaybeRow("load", { data: { id: "a" }, error: null })).toEqual({ id: "a" });
  });

  it("returns null when nothing matched", () => {
    expect(unwrapMaybeRow("load", { data: null, error: null })).toBeNull();
  });

  it("throws when the query itself failed", () => {
    expect(() => unwrapMaybeRow("load household", { data: null, error: failure })).toThrow(
      "load household: permission denied for table expenses",
    );
  });
});

describe("DataAccessError", () => {
  it("is named so it can be told apart in a stack trace", () => {
    expect(new DataAccessError("load", "boom").name).toBe("DataAccessError");
  });
});

const gatewayFields = {
  name: "PostgrestError",
  message: "Gateway Timeout",
  details: "",
  hint: "",
  code: "",
};
/** A REST-gateway failure: no SQLSTATE, because Postgres was never reached. */
const gatewayTimeout: PostgrestError = { ...gatewayFields, toJSON: () => gatewayFields };

describe("rowsOf", () => {
  it("returns the rows of a query that worked first time", async () => {
    const factory = vi.fn(async () => ({ data: [{ id: "a" }], error: null }));

    await expect(rowsOf("load", factory)).resolves.toEqual([{ id: "a" }]);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("gives the query another go when the gateway timed out", async () => {
    // Supabase's REST layer intermittently drops a request Postgres answered
    // in milliseconds; retrying beats showing an error screen.
    const factory = vi
      .fn<() => Promise<{ data: { id: string }[] | null; error: PostgrestError | null }>>()
      .mockResolvedValueOnce({ data: null, error: gatewayTimeout })
      .mockResolvedValueOnce({ data: [{ id: "a" }], error: null });

    await expect(rowsOf("load", factory)).resolves.toEqual([{ id: "a" }]);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("survives the gateway timing out twice in a row (regression: load profiles crashed the layout)", async () => {
    const factory = vi
      .fn<() => Promise<{ data: { id: string }[] | null; error: PostgrestError | null }>>()
      .mockResolvedValueOnce({ data: null, error: gatewayTimeout })
      .mockResolvedValueOnce({ data: null, error: gatewayTimeout })
      .mockResolvedValueOnce({ data: [{ id: "a" }], error: null });

    await expect(rowsOf("load profiles", factory)).resolves.toEqual([{ id: "a" }]);
    expect(factory).toHaveBeenCalledTimes(3);
  });

  it("gives up after a bounded number of retries rather than hammering an outage", async () => {
    const factory = vi.fn(async () => ({ data: null, error: gatewayTimeout }));

    await expect(rowsOf("load expenses", factory)).rejects.toThrow(
      "load expenses: Gateway Timeout",
    );
    expect(factory).toHaveBeenCalledTimes(RETRY_DELAYS_MS.length + 1);
  });

  it("never retries a refusal from the database itself", async () => {
    // "permission denied" carries a SQLSTATE and will say the same thing twice.
    const factory = vi.fn(async () => ({ data: null, error: failure }));

    await expect(rowsOf("load expenses", factory)).rejects.toThrow(DataAccessError);
    expect(factory).toHaveBeenCalledTimes(1);
  });
});

describe("maybeRowOf", () => {
  it("returns the row", async () => {
    const factory = vi.fn(async () => ({ data: { id: "a" }, error: null }));

    await expect(maybeRowOf("load", factory)).resolves.toEqual({ id: "a" });
  });

  it("retries a gateway failure here too", async () => {
    const factory = vi
      .fn<() => Promise<{ data: { id: string } | null; error: PostgrestError | null }>>()
      .mockResolvedValueOnce({ data: null, error: gatewayTimeout })
      .mockResolvedValueOnce({ data: { id: "a" }, error: null });

    await expect(maybeRowOf("load household", factory)).resolves.toEqual({ id: "a" });
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("surfaces a real failure", async () => {
    const factory = vi.fn(async () => ({ data: null, error: failure }));

    await expect(maybeRowOf("load household", factory)).rejects.toThrow(DataAccessError);
  });
});
