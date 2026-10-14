import { describe, expect, it } from "vitest";
import { z } from "zod";

import { content } from "@/content/es";

import {
  createFieldProps,
  errorState,
  fieldErrorsFrom,
  IDLE_STATE,
  formValues,
  parseForm,
  successState,
} from "./state";

const schema = z.object({
  name: z.string().min(1, { error: "Nombre obligatorio" }),
  amount: z.coerce.number().int().positive({ error: "Monto inválido" }),
});

function formDataFrom(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

describe("action states", () => {
  it("starts idle", () => {
    expect(IDLE_STATE).toEqual({ status: "idle" });
  });

  it("reports a success with its message", () => {
    expect(successState("Listo")).toEqual({ status: "success", message: "Listo" });
  });

  it("reports an error with no field messages by default", () => {
    expect(errorState("Falló")).toEqual({
      status: "error",
      message: "Falló",
      fieldErrors: {},
      values: {},
    });
  });

  it("carries field messages when given them", () => {
    expect(errorState("Falló", { name: "Obligatorio" })).toEqual({
      status: "error",
      message: "Falló",
      fieldErrors: { name: "Obligatorio" },
      values: {},
    });
  });
});

describe("fieldErrorsFrom", () => {
  it("keys each message by its field", () => {
    const result = schema.safeParse({ name: "", amount: "0" });
    const errors = result.success ? {} : fieldErrorsFrom(result.error);

    expect(errors).toEqual({ name: "Nombre obligatorio", amount: "Monto inválido" });
  });

  it("keeps only the first message for a field", () => {
    const strict = z.object({
      code: z.string().min(5, { error: "Muy corto" }).regex(/^\d+$/, { error: "Solo números" }),
    });
    const result = strict.safeParse({ code: "ab" });
    const errors = result.success ? {} : fieldErrorsFrom(result.error);

    expect(errors.code).toBe("Muy corto");
  });

  it("joins nested paths with a dot", () => {
    const nested = z.object({ user: z.object({ name: z.string({ error: "Falta" }) }) });
    const result = nested.safeParse({ user: {} });
    const errors = result.success ? {} : fieldErrorsFrom(result.error);

    expect(errors["user.name"]).toBe("Falta");
  });
});

describe("parseForm", () => {
  it("returns the parsed values when the form is valid", () => {
    const result = parseForm(schema, formDataFrom({ name: "Agua", amount: "80000" }));

    expect(result).toEqual({ ok: true, data: { name: "Agua", amount: 80_000 } });
  });

  it("returns renderable state when the form is invalid", () => {
    const result = parseForm(schema, formDataFrom({ name: "", amount: "0" }));

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected the parse to fail");
    }
    expect(result.state).toEqual({
      status: "error",
      message: content.validation.formInvalid,
      fieldErrors: { name: "Nombre obligatorio", amount: "Monto inválido" },
      // Echoed back so the form can restore what was typed.
      values: { name: "", amount: "0" },
    });
  });

  it("treats a missing field as invalid rather than throwing", () => {
    const result = parseForm(schema, formDataFrom({}));

    expect(result.ok).toBe(false);
  });
});

describe("formValues", () => {
  it("collects the text the user submitted", () => {
    expect(formValues(formDataFrom({ name: "Agua", amount: "80000" }))).toEqual({
      name: "Agua",
      amount: "80000",
    });
  });

  it("skips anything that is not text, such as a file", () => {
    const formData = formDataFrom({ name: "Agua" });
    formData.set("receipt", new File(["x"], "recibo.png"));

    expect(formValues(formData)).toEqual({ name: "Agua" });
  });
});

describe("createFieldProps", () => {
  it("wires a field to its name, with nothing to restore on a fresh form", () => {
    const fields = createFieldProps(IDLE_STATE);

    expect(fields("amount")).toEqual({ name: "amount", error: undefined, defaultValue: undefined });
  });

  it("uses the stored value as the starting point", () => {
    const fields = createFieldProps(IDLE_STATE);

    expect(fields("name", "Julián").defaultValue).toBe("Julián");
  });

  it("restores what was submitted after a failure, over the stored value", () => {
    const fields = createFieldProps(
      errorState("Falló", { name: "Obligatorio" }, { name: "Julian typo" }),
    );

    expect(fields("name", "Julián")).toEqual({
      name: "name",
      error: "Obligatorio",
      defaultValue: "Julian typo",
    });
  });

  it("falls back to the stored value for a field that was not submitted", () => {
    const fields = createFieldProps(errorState("Falló", {}, { other: "x" }));

    expect(fields("name", "Julián").defaultValue).toBe("Julián");
  });

  it("carries no error for a field that was not at fault", () => {
    const fields = createFieldProps(errorState("Falló", { amount: "Inválido" }, {}));

    expect(fields("name").error).toBeUndefined();
  });

  it("forgets everything once a save succeeds", () => {
    const fields = createFieldProps(successState("Listo"));

    expect(fields("name", "Julián")).toEqual({
      name: "name",
      error: undefined,
      defaultValue: "Julián",
    });
  });

  describe("isChecked", () => {
    it("uses the stored state on a fresh form", () => {
      const fields = createFieldProps(IDLE_STATE);

      expect(fields.isChecked("shared", true)).toBe(true);
      expect(fields.isChecked("shared", false)).toBe(false);
    });

    it("restores a toggle that was on when the save failed", () => {
      const fields = createFieldProps(errorState("Falló", {}, { shared: "on" }));

      expect(fields.isChecked("shared", false)).toBe(true);
    });

    it("accepts either form a checkbox posts", () => {
      const fields = createFieldProps(errorState("Falló", {}, { shared: "true" }));

      expect(fields.isChecked("shared", false)).toBe(true);
    });

    it("treats an absent toggle as off, which is how forms post it", () => {
      const fields = createFieldProps(errorState("Falló", {}, { other: "x" }));

      expect(fields.isChecked("shared", true)).toBe(false);
    });
  });
});
