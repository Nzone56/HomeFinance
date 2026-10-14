import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { content } from "@/content/es";
import { createExpense, createTransfer } from "@/features/transactions/actions";
import { expensesForMonth } from "@/lib/calculations/installments";
import { successState } from "@/lib/actions/state";
import { GF, JULIAN, makeExpense, makeTransfer } from "@/test/factories";

import { ExpenseList } from "./expense-list";
import { ExpenseSheet } from "./expense-sheet";
import { MovementsTabs } from "./movements-tabs";
import { TransferList } from "./transfer-list";
import { TransferSheet } from "./transfer-sheet";
import { buildMemberColors } from "@/lib/ui/member-colors";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/transactions/actions", () => ({
  createExpense: vi.fn(async () => successState("Listo")),
  createTransfer: vi.fn(async () => successState("Listo")),
  updateExpense: vi.fn(async () => successState("Listo")),
  deleteExpense: vi.fn(async () => successState("Listo")),
  deleteTransfer: vi.fn(async () => successState("Listo")),
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

const categories = [{ value: "rent", label: "Arriendo" }];
const members = [
  { value: JULIAN, label: "Julián" },
  { value: GF, label: "GF" },
];
const methods = [
  { value: "bank", label: "Bancolombia", isCreditCard: false, defaultRatePercent: null },
  { value: "card", label: "TC1", isCreditCard: true, defaultRatePercent: 28.5 },
];

/** The edit form each row carries needs the same choices the page has. */
const listExtras = {
  categories,
  paymentMethods: methods,
  members,
  defaultUserId: JULIAN,
  defaultDate: "2026-09-12",
};

const monthSharesOf = (expenses: Parameters<typeof expensesForMonth>[0]) =>
  expensesForMonth(expenses, "2026-09");

describe("ExpenseList", () => {
  it("shows each expense with its category, payer and method", () => {
    render(
      <ExpenseList
        expenses={monthSharesOf([
          makeExpense({
            description: "Recibo del agua",
            amount: 80_000,
            category_id: "rent",
            user_id: JULIAN,
            payment_method_id: "bank",
            occurred_on: "2026-09-11",
          }),
        ])}
        labels={labels}
        {...listExtras}
      />,
    );

    expect(screen.getByText("Recibo del agua")).toBeInTheDocument();
    // The payer is the avatar now; the row text carries where it went and how.
    expect(screen.getByText(/Arriendo/)).toBeInTheDocument();
    expect(screen.getByText(/Bancolombia/)).toBeInTheDocument();
    expect(screen.getByTitle("Julián")).toBeInTheDocument();
    expect(screen.getByText("$ 80.000")).toBeInTheDocument();
  });

  it("marks a personal expense", () => {
    render(
      <ExpenseList
        expenses={monthSharesOf([makeExpense({ shared: false })])}
        labels={labels}
        {...listExtras}
      />,
    );

    expect(screen.getByText(content.expenses.personal)).toBeInTheDocument();
  });

  it("strikes through an expense that has been switched off", () => {
    render(
      <ExpenseList
        expenses={monthSharesOf([makeExpense({ active: false })])}
        labels={labels}
        {...listExtras}
      />,
    );

    expect(screen.getByText(content.expenses.excluded)).toBeInTheDocument();
  });

  it("says how a bill is spread across months", () => {
    render(
      <ExpenseList
        expenses={monthSharesOf([
          makeExpense({ amount: 160_000, occurred_on: "2026-09-01", installments: 2 }),
        ])}
        labels={labels}
        {...listExtras}
      />,
    );

    expect(screen.getByText("Se reparte en 2 meses")).toBeInTheDocument();
    // The row shows this month's share, not the whole bill.
    expect(screen.getByText("$ 80.000")).toBeInTheDocument();
  });

  it("numbers the cuota on a card purchase", () => {
    render(
      <ExpenseList
        expenses={monthSharesOf([
          makeExpense({
            amount: 1_200_000,
            occurred_on: "2026-09-01",
            installments: 12,
            annual_rate_percent: 28.5,
          }),
        ])}
        labels={labels}
        {...listExtras}
      />,
    );

    expect(screen.getByText("Cuota 1 de 12")).toBeInTheDocument();
  });

  it("marks a bill that comes back every month", () => {
    const { container } = render(
      <ExpenseList
        expenses={monthSharesOf([makeExpense({ occurred_on: "2026-09-01", repeat_months: 1 })])}
        labels={labels}
        {...listExtras}
      />,
    );

    expect(container.querySelector(".lucide-repeat")).toBeInTheDocument();
  });

  it("leaves the repeat mark off a one-off expense", () => {
    const { container } = render(
      <ExpenseList expenses={monthSharesOf([makeExpense()])} labels={labels} {...listExtras} />,
    );

    expect(container.querySelector(".lucide-repeat")).not.toBeInTheDocument();
  });

  it("offers a toggle and a delete for every row", () => {
    render(
      <ExpenseList expenses={monthSharesOf([makeExpense()])} labels={labels} {...listExtras} />,
    );

    expect(screen.getByRole("switch", { name: content.a11y.toggleExpense })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: content.a11y.deleteExpense })).toBeInTheDocument();
  });

  it("explains what an excluded expense means", () => {
    render(
      <ExpenseList expenses={monthSharesOf([makeExpense()])} labels={labels} {...listExtras} />,
    );

    expect(screen.getByText(content.expenses.excludedHint)).toBeInTheDocument();
  });

  it("says so when the month is empty", () => {
    render(<ExpenseList expenses={[]} labels={labels} {...listExtras} />);

    expect(screen.getByText(content.expenses.empty)).toBeInTheDocument();
    expect(screen.getByText(content.expenses.emptyHint)).toBeInTheDocument();
  });

  it("falls back to a dash for a reference it cannot name", () => {
    render(
      <ExpenseList
        expenses={monthSharesOf([makeExpense({ category_id: "gone", payment_method_id: "gone" })])}
        labels={labels}
        {...listExtras}
      />,
    );

    expect(screen.getByText(/—/)).toBeInTheDocument();
  });
});

describe("TransferList", () => {
  it("shows where the money went, and from whom", () => {
    render(
      <TransferList
        transfers={[
          makeTransfer({
            from_payment_method_id: "bank",
            to_payment_method_id: "card",
            amount: 370_000,
            user_id: JULIAN,
            occurred_on: "2026-09-20",
          }),
        ]}
        labels={labels}
        {...listExtras}
      />,
    );

    expect(screen.getByText("Bancolombia")).toBeInTheDocument();
    expect(screen.getByText("TC1")).toBeInTheDocument();
    expect(screen.getByText("$ 370.000")).toBeInTheDocument();
    expect(screen.getByText("Julián")).toBeInTheDocument();
  });

  it("offers a delete for every row", () => {
    render(<TransferList transfers={[makeTransfer()]} labels={labels} />);

    expect(screen.getByRole("button", { name: content.a11y.deleteTransfer })).toBeInTheDocument();
  });

  it("explains what a transfer is when there are none", () => {
    render(<TransferList transfers={[]} labels={labels} />);

    expect(screen.getByText(content.transfers.empty)).toBeInTheDocument();
    expect(screen.getByText(content.transfers.hint)).toBeInTheDocument();
  });
});

describe("MovementsTabs", () => {
  it("shows spending first", () => {
    render(
      <MovementsTabs expenses={<p>Lista de gastos</p>} transfers={<p>Lista de traslados</p>} />,
    );

    expect(screen.getByText("Lista de gastos")).toBeInTheDocument();
  });

  it("keeps transfers behind their own tab, so the two are never confused", async () => {
    render(
      <MovementsTabs expenses={<p>Lista de gastos</p>} transfers={<p>Lista de traslados</p>} />,
    );

    await userEvent.click(screen.getByRole("tab", { name: content.expenses.tabTransfers }));

    expect(screen.getByText("Lista de traslados")).toBeInTheDocument();
  });
});

describe("ExpenseSheet", () => {
  const openSheet = async () => {
    render(
      <ExpenseSheet
        categories={categories}
        paymentMethods={methods}
        members={members}
        defaultUserId={JULIAN}
        defaultDate="2026-09-11"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: content.expenses.new }));
  };

  it("starts with today's date and whoever is signed in", async () => {
    await openSheet();

    expect(screen.getByLabelText(content.expenses.date)).toHaveValue("2026-09-11");
    expect(screen.getByRole("combobox", { name: content.expenses.paidBy })).toHaveTextContent(
      "Julián",
    );
  });

  it("asks how many months a bill covers when it is not a card", async () => {
    await openSheet();

    expect(screen.getByLabelText(content.expenses.coversMonths)).toBeInTheDocument();
    expect(screen.queryByLabelText(content.expenses.annualRate)).not.toBeInTheDocument();
  });

  it("asks for cuotas once a credit card is chosen, but no rate for a single one", async () => {
    // A card's default rate used to fill in on a one-cuota purchase, which the
    // save then refused (regression).
    await openSheet();

    await userEvent.click(screen.getByRole("combobox", { name: content.expenses.paymentMethod }));
    await userEvent.click(screen.getByRole("option", { name: "TC1" }));

    expect(screen.getByLabelText(content.expenses.installments)).toHaveValue("1");
    expect(screen.queryByLabelText(content.expenses.annualRate)).not.toBeInTheDocument();
  });

  it("asks for the card's rate once the purchase is in cuotas, and drops it back at one", async () => {
    await openSheet();

    await userEvent.click(screen.getByRole("combobox", { name: content.expenses.paymentMethod }));
    await userEvent.click(screen.getByRole("option", { name: "TC1" }));
    const installments = screen.getByLabelText(content.expenses.installments);
    await userEvent.clear(installments);
    await userEvent.type(installments, "12");

    expect(screen.getByLabelText(content.expenses.annualRate)).toHaveValue("28.5");

    await userEvent.clear(installments);
    await userEvent.type(installments, "1");

    expect(screen.queryByLabelText(content.expenses.annualRate)).not.toBeInTheDocument();
  });

  it("leaves the rate empty for a card that offers none, which means no interest", async () => {
    render(
      <ExpenseSheet
        categories={categories}
        paymentMethods={[
          { value: "plain", label: "TC sin tasa", isCreditCard: true, defaultRatePercent: null },
        ]}
        members={members}
        defaultUserId={JULIAN}
        defaultDate="2026-09-11"
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: content.expenses.new }));
    await userEvent.click(screen.getByRole("combobox", { name: content.expenses.paymentMethod }));
    await userEvent.click(screen.getByRole("option", { name: "TC sin tasa" }));
    await userEvent.type(screen.getByLabelText(content.expenses.installments), "2");

    expect(screen.getByLabelText(content.expenses.annualRate)).toHaveValue("");
  });

  it("offers how often a bill comes back", async () => {
    await openSheet();

    await userEvent.click(screen.getByRole("combobox", { name: content.expenses.repeat }));

    expect(
      screen.getByRole("option", { name: content.expenses.repeatMonthly }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: content.expenses.repeatBimonthly }),
    ).toBeInTheDocument();
  });

  it("treats a new expense as shared until told otherwise", async () => {
    await openSheet();

    expect(screen.getByRole("switch", { name: content.expenses.shared })).toBeChecked();
  });

  it("asks for the payer's part of a shared expense, starting at half", async () => {
    await openSheet();

    expect(screen.getByLabelText(content.expenses.payerShare)).toHaveValue("50");
  });

  it("stops asking for a split once the expense is personal", async () => {
    await openSheet();

    await userEvent.click(screen.getByRole("switch", { name: content.expenses.shared }));

    expect(screen.queryByLabelText(content.expenses.payerShare)).not.toBeInTheDocument();
  });

  it("sends the whole entry to the action", async () => {
    await openSheet();

    await userEvent.type(screen.getByLabelText(content.expenses.description), "Agua");
    await userEvent.type(screen.getByLabelText(content.expenses.amount), "80000");
    await userEvent.click(screen.getByRole("button", { name: content.common.save }));

    await waitFor(() => expect(createExpense).toHaveBeenCalled());
    const posted = vi.mocked(createExpense).mock.calls.at(0)?.[1];
    expect(posted?.get("description")).toBe("Agua");
    expect(posted?.get("amount")).toBe("80000");
    expect(posted?.get("installments")).toBe("1");
  });
});

describe("TransferSheet", () => {
  it("says plainly that a transfer is not a gasto", async () => {
    render(
      <TransferSheet
        paymentMethods={methods}
        members={members}
        defaultUserId={JULIAN}
        defaultDate="2026-09-11"
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: content.transfers.new }));

    expect(screen.getByText(content.transfers.hint)).toBeInTheDocument();
  });

  it("asks for both ends of the move", async () => {
    render(
      <TransferSheet
        paymentMethods={methods}
        members={members}
        defaultUserId={JULIAN}
        defaultDate="2026-09-11"
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: content.transfers.new }));

    expect(screen.getByRole("combobox", { name: content.transfers.from })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: content.transfers.to })).toBeInTheDocument();
  });

  it("sends the transfer to the action", async () => {
    render(
      <TransferSheet
        paymentMethods={methods}
        members={members}
        defaultUserId={JULIAN}
        defaultDate="2026-09-11"
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: content.transfers.new }));
    await userEvent.type(screen.getByLabelText(content.transfers.amount), "370000");
    await userEvent.click(screen.getByRole("button", { name: content.common.save }));

    await waitFor(() => expect(createTransfer).toHaveBeenCalled());
    expect(vi.mocked(createTransfer).mock.calls.at(0)?.[1]?.get("amount")).toBe("370000");
  });
});
