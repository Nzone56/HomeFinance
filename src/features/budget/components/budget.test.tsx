import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { content } from "@/content/es";
import {
  resetBudgetMonthOverride,
  saveBudgetMonthOverride,
  saveBudgetTemplateItem,
  saveIncomeTemplateAmount,
} from "@/features/budget/actions";
import { errorState, successState } from "@/lib/actions/state";
import { resolveExpectedIncome } from "@/lib/calculations/income";
import { GF, JULIAN, makeCategory, makeIncomeTemplateItem } from "@/test/factories";

import { AmountRowForm } from "./amount-row-form";
import { PlanEditor } from "./plan-editor";
import { PlanTabs } from "./plan-tabs";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/budget/actions", () => ({
  saveBudgetTemplateItem: vi.fn(async () => successState("Listo")),
  saveBudgetMonthOverride: vi.fn(async () => successState("Listo")),
  resetBudgetMonthOverride: vi.fn(async () => successState("Listo")),
  saveIncomeMonthOverride: vi.fn(async () => successState("Listo")),
  resetIncomeMonthOverride: vi.fn(async () => successState("Listo")),
  saveIncomeTemplateAmount: vi.fn(async () => successState("Listo")),
}));

const categories = [
  makeCategory({ id: "rent", name: "Arriendo", sort_order: 10 }),
  makeCategory({ id: "old", name: "Viejo", archived: true }),
];

const incomeItems = [
  makeIncomeTemplateItem({ id: "payroll", user_id: JULIAN, label: "Nómina", amount: 4_500_000 }),
];

const memberNames = new Map([
  [JULIAN, "Julián"],
  [GF, "GF"],
]);

function renderEditor(mode: "template" | "month", overridden: string[] = []) {
  return render(
    <PlanEditor
      mode={mode}
      month="2026-09"
      categories={categories}
      plannedByCategory={new Map([["rent", 1_500_000]])}
      recurringByCategory={new Map()}
      overriddenCategories={new Set(overridden)}
      incomeItems={incomeItems}
      incomeBaselines={new Map([["payroll", 4_500_000]])}
      expectedIncome={resolveExpectedIncome(incomeItems, [], [], "2026-09")}
      memberNames={memberNames}
    />,
  );
}

describe("AmountRowForm", () => {
  it("shows the label and the current amount", () => {
    render(
      <AmountRowForm
        action={saveBudgetTemplateItem}
        label="Arriendo"
        amount={1_500_000}
        hidden={{ category_id: "rent" }}
      />,
    );

    expect(screen.getByLabelText("Arriendo")).toHaveValue("1500000");
  });

  it("sends the row's identity along with the amount", async () => {
    render(
      <AmountRowForm
        action={saveBudgetTemplateItem}
        label="Arriendo"
        amount={1_500_000}
        hidden={{ category_id: "rent" }}
      />,
    );

    await userEvent.clear(screen.getByLabelText("Arriendo"));
    await userEvent.type(screen.getByLabelText("Arriendo"), "1600000");
    await userEvent.click(screen.getByRole("button", { name: content.common.save }));

    await waitFor(() => expect(saveBudgetTemplateItem).toHaveBeenCalled());
    const posted = vi.mocked(saveBudgetTemplateItem).mock.calls.at(0)?.[1];
    expect(posted?.get("category_id")).toBe("rent");
    expect(posted?.get("amount")).toBe("1600000");
  });

  it("shows why an amount was rejected, next to the field", async () => {
    vi.mocked(saveBudgetTemplateItem).mockResolvedValue(
      errorState(content.validation.formInvalid, { amount: content.validation.amountInvalid }),
    );

    render(
      <AmountRowForm
        action={saveBudgetTemplateItem}
        label="Arriendo"
        amount={1_500_000}
        hidden={{ category_id: "rent" }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: content.common.save }));

    expect(await screen.findByRole("alert")).toHaveTextContent(content.validation.amountInvalid);
    expect(screen.getByLabelText("Arriendo")).toHaveAttribute("aria-invalid", "true");
  });

  it("shows a line of context under the amount when given one", () => {
    render(
      <AmountRowForm
        action={saveBudgetTemplateItem}
        label="Suscripciones"
        amount={10_000}
        hidden={{ category_id: "subscriptions" }}
        note="Se suma a $ 65.000 de gastos que se repiten."
      />,
    );

    expect(screen.getByText("Se suma a $ 65.000 de gastos que se repiten.")).toBeInTheDocument();
  });

  it("shows a badge when given one", () => {
    render(
      <AmountRowForm
        action={saveBudgetTemplateItem}
        label="Arriendo"
        amount={1}
        hidden={{ category_id: "rent" }}
        badge={content.budget.overridden}
      />,
    );

    expect(screen.getByText(content.budget.overridden)).toBeInTheDocument();
  });

  it("offers a way back to the template only when the row overrides it", async () => {
    render(
      <AmountRowForm
        action={saveBudgetMonthOverride}
        label="Arriendo"
        amount={1}
        hidden={{ month: "2026-09", category_id: "rent" }}
        reset={{
          action: resetBudgetMonthOverride,
          hidden: { month: "2026-09", category_id: "rent" },
        }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: content.budget.resetToTemplate }));

    await waitFor(() => expect(resetBudgetMonthOverride).toHaveBeenCalled());
    expect(vi.mocked(resetBudgetMonthOverride).mock.calls.at(0)?.[1]?.get("category_id")).toBe(
      "rent",
    );
  });

  it("has no reset when the row already follows the template", () => {
    render(
      <AmountRowForm
        action={saveBudgetTemplateItem}
        label="Arriendo"
        amount={1}
        hidden={{ category_id: "rent" }}
      />,
    );

    expect(
      screen.queryByRole("button", { name: content.budget.resetToTemplate }),
    ).not.toBeInTheDocument();
  });
});

describe("PlanEditor", () => {
  it("says what each category's repeating expenses already plan", () => {
    render(
      <PlanEditor
        mode="month"
        month="2026-09"
        categories={categories}
        plannedByCategory={new Map([["rent", 0]])}
        recurringByCategory={new Map([["rent", 1_500_000]])}
        overriddenCategories={new Set()}
        incomeItems={[]}
        incomeBaselines={new Map()}
        expectedIncome={[]}
        memberNames={memberNames}
      />,
    );

    expect(screen.getByText("Se suma a $ 1.500.000 de gastos que se repiten.")).toBeInTheDocument();
  });

  it("says nothing extra for a category with no repeating expenses", () => {
    renderEditor("month");

    expect(screen.queryByText(/gastos que se repiten/)).not.toBeInTheDocument();
  });

  it("explains which plan is being edited", () => {
    renderEditor("template");
    expect(screen.getByText(content.budget.templateHint)).toBeInTheDocument();
  });

  it("explains that a month edit leaves the template alone", () => {
    renderEditor("month");
    expect(screen.getByText(content.budget.monthHint)).toBeInTheDocument();
  });

  it("leaves archived categories out of the plan", () => {
    renderEditor("template");

    expect(screen.getByLabelText("Arriendo")).toBeInTheDocument();
    expect(screen.queryByLabelText("Viejo")).not.toBeInTheDocument();
  });

  it("plans expenses and income side by side", () => {
    renderEditor("template");

    expect(screen.getByText(content.budget.expenseSection)).toBeInTheDocument();
    expect(screen.getByText(content.budget.incomeSection)).toBeInTheDocument();
    expect(screen.getByLabelText("Nómina · Julián")).toBeInTheDocument();
  });

  it("says which month rows follow the template and which depart from it", () => {
    renderEditor("month", ["rent"]);

    expect(screen.getAllByText(content.budget.overridden).length).toBeGreaterThan(0);
    expect(screen.getAllByText(content.budget.usesTemplate).length).toBeGreaterThan(0);
  });

  it("shows no badges at all on the template itself", () => {
    renderEditor("template");

    expect(screen.queryByText(content.budget.usesTemplate)).not.toBeInTheDocument();
    expect(screen.queryByText(content.budget.overridden)).not.toBeInTheDocument();
  });

  it("writes to the template in template mode", async () => {
    renderEditor("template");

    await userEvent.click(
      within(screen.getByLabelText("Arriendo").closest("form") as HTMLElement).getByRole("button"),
    );

    await waitFor(() => expect(saveBudgetTemplateItem).toHaveBeenCalled());
    expect(saveBudgetMonthOverride).not.toHaveBeenCalled();
  });

  it("writes only to the month in month mode", async () => {
    renderEditor("month");

    await userEvent.click(
      within(screen.getByLabelText("Arriendo").closest("form") as HTMLElement).getByRole("button"),
    );

    await waitFor(() => expect(saveBudgetMonthOverride).toHaveBeenCalled());
    expect(saveBudgetTemplateItem).not.toHaveBeenCalled();
  });

  it("edits the income baseline from the template", async () => {
    renderEditor("template");

    await userEvent.click(
      within(screen.getByLabelText("Nómina · Julián").closest("form") as HTMLElement).getByRole(
        "button",
      ),
    );

    await waitFor(() => expect(saveIncomeTemplateAmount).toHaveBeenCalled());
  });

  it("lists in a month only the sources expected in it", () => {
    // A retired source, and one that only starts next month, have nothing to
    // adjust this month.
    const retired = makeIncomeTemplateItem({
      id: "old-job",
      user_id: GF,
      label: "Viejo",
      active: false,
    });
    const later = makeIncomeTemplateItem({
      id: "later",
      user_id: GF,
      label: "Nuevo",
      starts_on: "2026-10-01",
    });
    const items = [...incomeItems, retired, later];

    render(
      <PlanEditor
        mode="month"
        month="2026-09"
        categories={[]}
        plannedByCategory={new Map()}
        recurringByCategory={new Map()}
        overriddenCategories={new Set()}
        incomeItems={items}
        incomeBaselines={new Map()}
        expectedIncome={resolveExpectedIncome(items, [], [], "2026-09")}
        memberNames={memberNames}
      />,
    );

    expect(screen.getByLabelText("Nómina · Julián")).toHaveValue("4500000");
    expect(screen.getByText(content.budget.usesTemplate)).toBeInTheDocument();
    expect(screen.queryByLabelText("Viejo · GF")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Nuevo · GF")).not.toBeInTheDocument();
  });

  it("shows each source in the template at its amount from this month on", () => {
    render(
      <PlanEditor
        mode="template"
        month="2026-09"
        categories={[]}
        plannedByCategory={new Map()}
        recurringByCategory={new Map()}
        overriddenCategories={new Set()}
        incomeItems={incomeItems}
        incomeBaselines={new Map([["payroll", 5_000_000]])}
        expectedIncome={[]}
        memberNames={memberNames}
      />,
    );

    expect(screen.getByLabelText("Nómina · Julián")).toHaveValue("5000000");
  });

  it("offers a way back to the template for an overridden income row", () => {
    render(
      <PlanEditor
        mode="month"
        month="2026-09"
        categories={[]}
        plannedByCategory={new Map()}
        recurringByCategory={new Map()}
        overriddenCategories={new Set()}
        incomeItems={incomeItems}
        incomeBaselines={new Map()}
        expectedIncome={[
          {
            templateItemId: "payroll",
            userId: JULIAN,
            label: "Nómina",
            paymentMethodId: null,
            amount: 3_000_000,
            isOverridden: true,
          },
        ]}
        memberNames={memberNames}
      />,
    );

    expect(screen.getByLabelText("Nómina · Julián")).toHaveValue("3000000");
    expect(
      screen.getByRole("button", { name: content.budget.resetToTemplate }),
    ).toBeInTheDocument();
  });

  it("says where to add income sources when there are none", () => {
    render(
      <PlanEditor
        mode="template"
        month="2026-09"
        categories={[]}
        plannedByCategory={new Map()}
        recurringByCategory={new Map()}
        overriddenCategories={new Set()}
        incomeItems={[]}
        incomeBaselines={new Map()}
        expectedIncome={[]}
        memberNames={memberNames}
      />,
    );

    expect(screen.getByText(content.budget.incomeEmpty)).toBeInTheDocument();
    expect(screen.getByText(content.settings.categoriesEmpty)).toBeInTheDocument();
  });
});

describe("PlanTabs", () => {
  it("opens on the month, which is what gets adjusted most", () => {
    render(
      <PlanTabs monthLabel="Septiembre 2026" month={<p>Ajustes</p>} template={<p>Plantilla</p>} />,
    );

    expect(screen.getByText("Ajustes")).toBeInTheDocument();
  });

  it("keeps the global template one tab away", async () => {
    render(
      <PlanTabs monthLabel="Septiembre 2026" month={<p>Ajustes</p>} template={<p>Plantilla</p>} />,
    );

    await userEvent.click(screen.getByRole("tab", { name: content.budget.templateTab }));

    expect(screen.getByText("Plantilla")).toBeInTheDocument();
  });
});
