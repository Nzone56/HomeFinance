import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { content } from "@/content/es";
import { createIncome, receiveExpectedIncome } from "@/features/transactions/actions";
import { successState } from "@/lib/actions/state";
import type { ExpectedIncomeRow } from "@/lib/calculations/income";
import { GF, JULIAN, makeIncome } from "@/test/factories";

import { ExpectedIncomeList } from "./expected-income-list";
import { ExpectedVsActual } from "./expected-vs-actual";
import { IncomeList } from "./income-list";
import { IncomeSheet } from "./income-sheet";
import { buildMemberColors } from "@/lib/ui/member-colors";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/transactions/actions", () => ({
  createIncome: vi.fn(async () => successState("Listo")),
  deleteIncome: vi.fn(async () => successState("Listo")),
  receiveExpectedIncome: vi.fn(async () => successState("Listo")),
}));

const labels = {
  categories: new Map<string, string>(),
  methods: new Map([["bank", "Bancolombia"]]),
  members: new Map([
    [JULIAN, "Julián"],
    [GF, "GF"],
  ]),
  memberColors: buildMemberColors([{ userId: JULIAN }, { userId: GF }]),
};

const members = [
  { value: JULIAN, label: "Julián" },
  { value: GF, label: "GF" },
];
const methods = [
  { value: "bank", label: "Bancolombia", isCreditCard: false, defaultRatePercent: null },
];

describe("IncomeList", () => {
  it("shows each income with who received it and where", () => {
    render(
      <IncomeList
        incomes={[
          makeIncome({
            label: "Nómina",
            amount: 4_500_000,
            user_id: JULIAN,
            payment_method_id: "bank",
            occurred_on: "2026-09-01",
          }),
        ]}
        labels={labels}
      />,
    );

    expect(screen.getByText("Nómina")).toBeInTheDocument();
    expect(screen.getByText("Julián · Bancolombia")).toBeInTheDocument();
    expect(screen.getByText("$ 4.500.000")).toBeInTheDocument();
  });

  it("says when income arrived without a tracked account", () => {
    render(
      <IncomeList
        incomes={[makeIncome({ user_id: GF, payment_method_id: null })]}
        labels={labels}
      />,
    );

    expect(screen.getByText(`GF · ${content.income.noAccount}`)).toBeInTheDocument();
  });

  it("offers a delete for every row", () => {
    render(<IncomeList incomes={[makeIncome()]} labels={labels} />);

    expect(screen.getByRole("button", { name: content.a11y.deleteIncome })).toBeInTheDocument();
  });

  it("says so when the month is empty", () => {
    render(<IncomeList incomes={[]} labels={labels} />);

    expect(screen.getByText(content.income.empty)).toBeInTheDocument();
    expect(screen.getByText(content.income.emptyHint)).toBeInTheDocument();
  });
});

describe("ExpectedVsActual", () => {
  it("shows what each person expected against what arrived", () => {
    render(
      <ExpectedVsActual
        colors={labels.memberColors}
        rows={[
          {
            userId: JULIAN,
            displayName: "Julián",
            expected: 4_500_000,
            actual: 4_500_000,
            difference: 0,
          },
          {
            userId: GF,
            displayName: "GF",
            expected: 3_500_000,
            actual: 2_900_000,
            difference: -600_000,
          },
        ]}
      />,
    );

    expect(screen.getByText("Julián")).toBeInTheDocument();
    expect(screen.getByText("$ 2.900.000")).toBeInTheDocument();
    // A shortfall reads as a negative, which is the number worth noticing.
    expect(screen.getByText("-$ 600.000")).toBeInTheDocument();
  });

  it("handles a household with nobody in it", () => {
    render(<ExpectedVsActual colors={labels.memberColors} rows={[]} />);

    expect(screen.getByText(content.income.expectedVsActual)).toBeInTheDocument();
  });
});

describe("ExpectedIncomeList", () => {
  const payroll: ExpectedIncomeRow = {
    templateItemId: "payroll",
    userId: JULIAN,
    label: "Nómina",
    paymentMethodId: "bank",
    amount: 4_500_000,
    isOverridden: false,
  };
  const freelance: ExpectedIncomeRow = {
    templateItemId: "freelance",
    userId: GF,
    label: "Independiente",
    paymentMethodId: null,
    amount: 1_000_000,
    isOverridden: false,
  };

  const renderList = (options: { received?: string[]; canReceive?: boolean } = {}) =>
    render(
      <ExpectedIncomeList
        rows={[payroll, freelance]}
        receivedIds={new Set(options.received ?? [])}
        month="2026-09"
        canReceive={options.canReceive ?? true}
        labels={labels}
      />,
    );

  it("lists what the plan expects, with who receives it, where and how much", () => {
    renderList();

    expect(screen.getByText(content.income.expectedTitle)).toBeInTheDocument();
    expect(screen.getByText("Julián · Bancolombia")).toBeInTheDocument();
    expect(screen.getByText(`GF · ${content.income.noAccount}`)).toBeInTheDocument();
    expect(screen.getByText("$ 4.500.000")).toBeInTheDocument();
  });

  it("offers to record each expected income that has not arrived", () => {
    renderList();

    expect(screen.getAllByRole("button", { name: content.income.markReceived })).toHaveLength(2);
  });

  it("records the source and the month it was expected in", async () => {
    renderList();

    await userEvent.click(
      screen.getAllByRole("button", { name: content.income.markReceived })[0] as HTMLElement,
    );

    await waitFor(() => expect(receiveExpectedIncome).toHaveBeenCalled());
    const posted = vi.mocked(receiveExpectedIncome).mock.calls.at(0)?.[1];
    expect(posted?.get("template_item_id")).toBe("payroll");
    expect(posted?.get("month")).toBe("2026-09");
  });

  it("marks what was already received instead of offering it again", () => {
    renderList({ received: ["payroll"] });

    expect(screen.getByText(content.income.received)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: content.income.markReceived })).toHaveLength(1);
  });

  it("offers nothing to record in a month that has not arrived", () => {
    renderList({ canReceive: false });

    expect(screen.getAllByText(content.income.notYet)).toHaveLength(2);
    expect(
      screen.queryByRole("button", { name: content.income.markReceived }),
    ).not.toBeInTheDocument();
  });

  it("shows nothing when the plan expects nothing this month", () => {
    const { container } = render(
      <ExpectedIncomeList
        rows={[]}
        receivedIds={new Set()}
        month="2026-09"
        canReceive
        labels={labels}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

describe("IncomeSheet", () => {
  const openSheet = async () => {
    render(
      <IncomeSheet
        paymentMethods={methods}
        members={members}
        defaultUserId={JULIAN}
        defaultDate="2026-09-01"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: content.income.new }));
  };

  it("starts with today and whoever is signed in", async () => {
    await openSheet();

    expect(screen.getByLabelText(content.income.date)).toHaveValue("2026-09-01");
    expect(screen.getByRole("combobox", { name: content.income.receivedBy })).toHaveTextContent(
      "Julián",
    );
  });

  it("lets income arrive without an account, for cash", async () => {
    await openSheet();

    expect(screen.getByRole("combobox", { name: content.income.account })).toHaveTextContent(
      content.income.noAccount,
    );
  });

  it("sends the entry to the action", async () => {
    await openSheet();

    await userEvent.type(screen.getByLabelText(content.income.label), "Nómina");
    await userEvent.type(screen.getByLabelText(content.income.amount), "4500000");
    await userEvent.click(screen.getByRole("button", { name: content.common.save }));

    await waitFor(() => expect(createIncome).toHaveBeenCalled());
    const posted = vi.mocked(createIncome).mock.calls.at(0)?.[1];
    expect(posted?.get("label")).toBe("Nómina");
    expect(posted?.get("amount")).toBe("4500000");
  });
});
