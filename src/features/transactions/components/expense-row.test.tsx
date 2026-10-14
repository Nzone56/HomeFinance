import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { content } from "@/content/es";
import { updateExpense } from "@/features/transactions/actions";
import { expensesForMonth } from "@/lib/calculations/installments";
import { successState } from "@/lib/actions/state";
import { buildMemberColors } from "@/lib/ui/member-colors";
import { setDesktop } from "@/test/media";
import { GF, JULIAN, makeExpense } from "@/test/factories";

import { ExpenseRow } from "./expense-row";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/features/transactions/actions", () => ({
  createExpense: vi.fn(async () => successState("Listo")),
  updateExpense: vi.fn(async () => successState("Listo")),
  deleteExpense: vi.fn(async () => successState("Listo")),
  setExpenseActive: vi.fn(async () => successState("Listo")),
}));

const labels = {
  categories: new Map([["rent", "Arriendo"]]),
  methods: new Map([
    ["bank", "Bancolombia"],
    ["card", "TC1"],
  ]),
  members: new Map([
    [JULIAN, "Julián"],
    [GF, "GF"],
  ]),
  memberColors: buildMemberColors([{ userId: JULIAN }, { userId: GF }]),
};

const extras = {
  labels,
  categories: [{ value: "rent", label: "Arriendo" }],
  paymentMethods: [
    { value: "bank", label: "Bancolombia", isCreditCard: false, defaultRatePercent: null },
    { value: "card", label: "TC1", isCreditCard: true, defaultRatePercent: 28.5 },
  ],
  members: [
    { value: JULIAN, label: "Julián" },
    { value: GF, label: "GF" },
  ],
  defaultUserId: JULIAN,
  defaultDate: "2026-09-12",
};

const rowFor = (overrides: Parameters<typeof makeExpense>[0]) => {
  const [expense] = expensesForMonth([makeExpense(overrides)], "2026-09");
  if (expense === undefined) {
    throw new Error("the fixture does not fall in September");
  }
  return (
    <ul>
      <ExpenseRow expense={expense} {...extras} />
    </ul>
  );
};

const expand = () =>
  userEvent.click(screen.getByRole("button", { expanded: false, name: /Recibo/ }));

beforeEach(() => {
  setDesktop(true);
});

describe("ExpenseRow", () => {
  it("keeps the detail out of the way until it is asked for", () => {
    render(
      rowFor({
        description: "Recibo del agua",
        category_id: "rent",
        payment_method_id: "bank",
        user_id: JULIAN,
        notes: "Del apartamento viejo",
      }),
    );

    expect(screen.getByRole("button", { name: /Recibo/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByText("Del apartamento viejo")).not.toBeInTheDocument();
  });

  it("opens everything the expense knows", async () => {
    render(
      rowFor({
        description: "Recibo del agua",
        category_id: "rent",
        payment_method_id: "bank",
        user_id: JULIAN,
        occurred_on: "2026-09-11",
        notes: "Del apartamento viejo",
      }),
    );

    await expand();

    expect(screen.getByText("11 de septiembre de 2026")).toBeInTheDocument();
    expect(screen.getByText("Del apartamento viejo")).toBeInTheDocument();
    expect(screen.getByText(content.common.yes)).toBeInTheDocument();
  });

  it("closes again on a second click", async () => {
    render(rowFor({ description: "Recibo del agua", notes: "Una nota" }));

    await expand();
    await userEvent.click(screen.getByRole("button", { expanded: true, name: /Recibo/ }));

    expect(screen.queryByText("Una nota")).not.toBeInTheDocument();
  });

  it("separates what the bill cost from what it costs this month", async () => {
    render(
      rowFor({
        description: "Recibo del agua",
        amount: 160_000,
        occurred_on: "2026-09-01",
        installments: 2,
      }),
    );

    await expand();

    expect(screen.getByText(content.expenses.totalAmount)).toBeInTheDocument();
    expect(screen.getByText("$ 160.000")).toBeInTheDocument();
    // Half of it lands in September, and half again in October.
    expect(screen.getAllByText("$ 80.000").length).toBeGreaterThan(0);
  });

  it("names the interest and the repeat when the expense carries them", async () => {
    render(
      rowFor({
        description: "Recibo del agua",
        amount: 160_000,
        occurred_on: "2026-09-01",
        installments: 3,
        annual_rate_percent: 28.5,
        repeat_months: 2,
        repeat_until: "2027-03-01",
      }),
    );

    await expand();

    expect(screen.getByText("28,5 %EA")).toBeInTheDocument();
    expect(screen.getByText("Cada 2 meses")).toBeInTheDocument();
    expect(screen.getByText("1 de marzo de 2027")).toBeInTheDocument();
  });

  it("leaves out the rows an expense has nothing to say about", async () => {
    render(rowFor({ description: "Recibo del agua" }));

    await expand();

    expect(screen.queryByText(content.expenses.totalAmount)).not.toBeInTheDocument();
    expect(screen.queryByText(content.expenses.repeat)).not.toBeInTheDocument();
    expect(screen.queryByText(content.expenses.notes)).not.toBeInTheDocument();
  });

  it("says a personal expense is not shared, and has no split to show", async () => {
    render(rowFor({ description: "Recibo del agua", shared: false }));

    await expand();

    expect(screen.getByText(content.common.no)).toBeInTheDocument();
    expect(screen.queryByText(content.expenses.split)).not.toBeInTheDocument();
  });

  it("shows how a shared expense divides between the two", async () => {
    render(rowFor({ description: "Recibo del agua", user_id: GF, payer_share_percent: 70 }));

    await expand();

    expect(screen.getByText(content.expenses.split)).toBeInTheDocument();
    expect(screen.getByText("GF 70% · Julián 30%")).toBeInTheDocument();
  });

  it("offers the stored split when editing a shared expense", async () => {
    render(rowFor({ description: "Recibo del agua", payer_share_percent: 65 }));

    await userEvent.click(screen.getByRole("button", { name: content.expenses.edit }));

    expect(await screen.findByLabelText(content.expenses.payerShare)).toHaveValue("65");
  });

  it("names the payer, whose avatar is the only mark for them on the row", () => {
    render(rowFor({ description: "Recibo del agua", user_id: GF }));

    expect(screen.getByTitle("GF")).toBeInTheDocument();
  });

  it("offers an edit form already filled in with what is stored", async () => {
    render(
      rowFor({
        description: "Recibo del agua",
        amount: 80_000,
        category_id: "rent",
        payment_method_id: "bank",
        user_id: JULIAN,
      }),
    );

    await userEvent.click(screen.getByRole("button", { name: content.expenses.edit }));

    expect(await screen.findByLabelText(content.expenses.description)).toHaveValue(
      "Recibo del agua",
    );
    expect(screen.getByLabelText(content.expenses.amount)).toHaveValue("80000");
  });

  it("sends the row's own id along with the edit, so the write lands on it", async () => {
    render(rowFor({ id: "expense-1", description: "Recibo del agua" }));

    await userEvent.click(screen.getByRole("button", { name: content.expenses.edit }));
    await userEvent.click(await screen.findByRole("button", { name: content.common.save }));

    await waitFor(() => expect(updateExpense).toHaveBeenCalled());
    expect(vi.mocked(updateExpense).mock.calls.at(0)?.[1]?.get("id")).toBe("expense-1");
  });

  it("edits the full amount of a spread bill, not this month's share", async () => {
    // Editing a bimonthly bill should show the bill, not half of it.
    render(
      rowFor({
        description: "Recibo del agua",
        amount: 160_000,
        occurred_on: "2026-09-01",
        installments: 2,
      }),
    );

    await userEvent.click(screen.getByRole("button", { name: content.expenses.edit }));

    expect(await screen.findByLabelText(content.expenses.amount)).toHaveValue("160000");
  });
});
