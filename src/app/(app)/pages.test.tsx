import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { content } from "@/content/es";
import { PlanView } from "@/features/budget/components/plan-view";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";
import { IncomeView } from "@/features/income/components/income-view";
import { MovementsView } from "@/features/transactions/components/movements-view";
import {
  loadDashboardData,
  loadIncomePageData,
  loadMovementsData,
  loadPlanData,
  loadSettingsData,
  type FinanceData,
} from "@/lib/data/finance";
import { requireHouseholdContext } from "@/lib/data/household";
import { currentMonthKey } from "@/lib/dates/month";
import {
  GF,
  JULIAN,
  makeBudgetTemplateItem,
  makeCategory,
  makeCreditCard,
  makeExpense,
  makeIncome,
  makeIncomeTemplateItem,
  makePaymentMethod,
  makeTransfer,
} from "@/test/factories";

import AuthenticatedLayout from "./layout";
import BudgetPage from "./budget/page";
import DashboardPage from "./dashboard/page";
import ExpensesPage from "./expenses/page";
import IncomePage from "./income/page";
import SettingsPage from "./settings/page";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/data/household", () => ({ requireHouseholdContext: vi.fn() }));
vi.mock("@/lib/data/finance", () => ({
  loadDashboardData: vi.fn(),
  loadMovementsData: vi.fn(),
  loadIncomePageData: vi.fn(),
  loadPlanData: vi.fn(),
  loadSettingsData: vi.fn(),
}));

// Server components that stream into the header; they have their own tests.
vi.mock("@/components/layout/shell-identity", () => ({
  HouseholdName: () => <span>Nuestra casa</span>,
  SignedInMember: () => <span title="Julián">JU</span>,
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/dashboard"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useRouter: vi.fn(() => ({ refresh: vi.fn(), replace: vi.fn() })),
}));

vi.mock("next/themes", () => ({
  useTheme: vi.fn(() => ({ theme: "system", resolvedTheme: "light", setTheme: vi.fn() })),
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabaseClient: vi.fn(() => ({
    channel: () => ({ on: () => ({ subscribe: vi.fn() }) }),
    removeChannel: vi.fn(),
  })),
}));

const bank = makePaymentMethod({ id: "bank", name: "Bancolombia", user_id: JULIAN });
const card = makeCreditCard({
  id: "card",
  name: "TC1",
  user_id: JULIAN,
  credit_limit: 5_000_000,
  closing_day: 15,
  due_day: 5,
});

const financeData: FinanceData = {
  categories: [makeCategory({ id: "rent", name: "Arriendo", sort_order: 10 })],
  paymentMethods: [bank, card],
  expenses: [
    makeExpense({
      description: "Arriendo de septiembre",
      category_id: "rent",
      payment_method_id: "bank",
      user_id: JULIAN,
      amount: 1_500_000,
      occurred_on: "2026-09-01",
    }),
  ],
  incomes: [
    makeIncome({ label: "Nómina", user_id: JULIAN, amount: 4_500_000, occurred_on: "2026-09-01" }),
  ],
  transfers: [
    makeTransfer({
      from_payment_method_id: "bank",
      to_payment_method_id: "card",
      user_id: JULIAN,
      occurred_on: "2026-09-20",
    }),
  ],
  budgetTemplate: [makeBudgetTemplateItem({ category_id: "rent", amount: 1_500_000 })],
  budgetOverrides: [],
  incomeTemplate: [
    makeIncomeTemplateItem({ id: "payroll", label: "Nómina", user_id: JULIAN, amount: 4_500_000 }),
  ],
  incomeTemplateAmounts: [],
  incomeOverrides: [],
};

const context = {
  userId: JULIAN,
  household: { id: "household-1", name: "Nuestra casa", created_at: "2026-01-01" },
  members: [
    { userId: JULIAN, displayName: "Julián", role: "owner" as const },
    { userId: GF, displayName: "GF", role: "member" as const },
  ],
};

const searchParams = (month?: string) => Promise.resolve(month === undefined ? {} : { month });

/** A page renders a Suspense boundary: its key, its fallback and what it wraps. */
interface SuspendedPage {
  key: string | null;
  props: { fallback: ReactElement; children: ReactElement<{ month: string }> };
}

const suspended = (page: ReactElement) => page as unknown as SuspendedPage;

beforeEach(() => {
  vi.mocked(requireHouseholdContext).mockResolvedValue(context);
  // Each view gets exactly the slice its own loader returns, so a view reaching
  // for data it no longer loads fails here rather than in production.
  vi.mocked(loadDashboardData).mockResolvedValue(financeData);
  vi.mocked(loadMovementsData).mockResolvedValue({
    categories: financeData.categories,
    paymentMethods: financeData.paymentMethods,
    expenses: financeData.expenses,
    transfers: financeData.transfers,
  });
  vi.mocked(loadIncomePageData).mockResolvedValue({
    paymentMethods: financeData.paymentMethods,
    incomes: financeData.incomes,
    incomeTemplate: financeData.incomeTemplate,
    incomeTemplateAmounts: financeData.incomeTemplateAmounts,
    incomeOverrides: financeData.incomeOverrides,
  });
  vi.mocked(loadPlanData).mockResolvedValue({
    categories: financeData.categories,
    expenses: financeData.expenses,
    budgetTemplate: financeData.budgetTemplate,
    budgetOverrides: financeData.budgetOverrides,
    incomeTemplate: financeData.incomeTemplate,
    incomeTemplateAmounts: financeData.incomeTemplateAmounts,
    incomeOverrides: financeData.incomeOverrides,
  });
  vi.mocked(loadSettingsData).mockResolvedValue({
    categories: financeData.categories,
    paymentMethods: financeData.paymentMethods,
    incomeTemplate: financeData.incomeTemplate,
    incomeTemplateAmounts: financeData.incomeTemplateAmounts,
  });
});

describe("AuthenticatedLayout", () => {
  it("renders the page at once, without waiting on the household", () => {
    render(AuthenticatedLayout({ children: <p>Contenido</p> }));

    expect(screen.getByText("Contenido")).toBeInTheDocument();
    // The identity slots resolve it on their own, behind Suspense.
    expect(requireHouseholdContext).not.toHaveBeenCalled();
  });

  it("wraps the page in the shell, household name and member mark included", () => {
    render(AuthenticatedLayout({ children: <p>Contenido</p> }));

    expect(screen.getByText("Nuestra casa")).toBeInTheDocument();
    expect(screen.getByTitle("Julián")).toBeInTheDocument();
  });
});

describe("month-keyed pages", () => {
  it("key the month's content by the month in the URL, so switching months shows a skeleton at once", async () => {
    for (const Page of [DashboardPage, ExpensesPage, IncomePage, BudgetPage]) {
      const page = suspended(await Page({ searchParams: searchParams("2026-09") }));

      expect(page.key).toBe("2026-09");
      expect(page.props.children.props.month).toBe("2026-09");
    }
  });

  it("fall back to the current month when the URL says nothing", async () => {
    for (const Page of [DashboardPage, ExpensesPage, IncomePage, BudgetPage]) {
      const page = suspended(await Page({ searchParams: searchParams() }));

      expect(page.key).toMatch(/^\d{4}-\d{2}$/);
    }
  });

  it("show a skeleton that names the page and the month while it loads", async () => {
    const page = suspended(await ExpensesPage({ searchParams: searchParams("2026-09") }));

    render(page.props.fallback);

    expect(screen.getByRole("status")).toHaveTextContent(content.common.loading);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      `${content.expenses.title}Septiembre 2026`,
    );
  });

  it("show a skeleton on every other page too", async () => {
    for (const Page of [DashboardPage, IncomePage, BudgetPage]) {
      const page = suspended(await Page({ searchParams: searchParams("2026-09") }));
      const { unmount } = render(page.props.fallback);

      expect(screen.getByRole("status")).toBeInTheDocument();
      unmount();
    }
  });
});

describe("DashboardView", () => {
  it("loads the month it is given, together with the session", async () => {
    await DashboardView({ month: "2026-09", currentMonth: "2026-09" });

    expect(loadDashboardData).toHaveBeenCalledWith("2026-09");
    expect(requireHouseholdContext).toHaveBeenCalled();
  });

  it("shows the headline figures, the plan and what the household spent together", async () => {
    render(await DashboardView({ month: "2026-09", currentMonth: "2026-09" }));

    expect(screen.getByText(content.dashboard.planVsActual)).toBeInTheDocument();
    expect(screen.getByText(content.dashboard.householdCard)).toBeInTheDocument();
    expect(screen.getByText(content.dashboard.breakdown)).toBeInTheDocument();
    // The trend names itself twice on purpose: once as the card title and once
    // as the caption of its table view.
    expect(screen.getAllByText(content.dashboard.trend).length).toBeGreaterThan(0);
    expect(screen.getByText(content.dashboard.creditCards)).toBeInTheDocument();
  });

  it("withholds a verdict on a month with no plan behind it", async () => {
    vi.mocked(loadDashboardData).mockResolvedValue({ ...financeData, budgetTemplate: [] });

    render(await DashboardView({ month: "2026-09", currentMonth: "2026-09" }));

    expect(screen.getAllByText(content.dashboard.budgetEmpty).length).toBeGreaterThan(0);
  });

  it("copes with a session whose profile has not landed yet", async () => {
    vi.mocked(requireHouseholdContext).mockResolvedValue({ ...context, members: [] });

    render(await DashboardView({ month: "2026-09", currentMonth: "2026-09" }));

    expect(screen.getByRole("heading", { name: "¡Hola, !", level: 1 })).toBeInTheDocument();
  });

  it("greets whoever is signed in and names the month it is showing", async () => {
    render(await DashboardView({ month: "2026-09", currentMonth: "2026-09" }));

    expect(screen.getByRole("heading", { name: "¡Hola, Julián!", level: 1 })).toBeInTheDocument();
    expect(screen.getAllByText("Septiembre 2026").length).toBeGreaterThan(0);
  });
});

describe("MovementsView", () => {
  it("lists the month's movements", async () => {
    render(await MovementsView({ month: "2026-09" }));

    expect(loadMovementsData).toHaveBeenCalledWith("2026-09");
    expect(screen.getByText("Arriendo de septiembre")).toBeInTheDocument();
  });

  it("keeps spending and transfers on separate tabs", async () => {
    render(await MovementsView({ month: "2026-09" }));

    expect(screen.getByRole("tab", { name: content.expenses.tabExpenses })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: content.expenses.tabTransfers })).toBeInTheDocument();
  });

  it("offers a way to add both kinds", async () => {
    render(await MovementsView({ month: "2026-09" }));

    expect(screen.getByRole("button", { name: content.expenses.new })).toBeInTheDocument();
  });
});

describe("IncomeView", () => {
  it("compares expected against received and lists what arrived", async () => {
    render(await IncomeView({ month: "2026-09" }));

    expect(loadIncomePageData).toHaveBeenCalledWith("2026-09");
    expect(screen.getByText(content.income.expectedVsActual)).toBeInTheDocument();
    // Once as what arrived, once as what the plan expects this month.
    expect(screen.getAllByText("Nómina")).toHaveLength(2);
    expect(screen.getByText(content.income.expectedTitle)).toBeInTheDocument();
  });

  it("offers a way to record more", async () => {
    render(await IncomeView({ month: "2026-09" }));

    expect(screen.getByRole("button", { name: content.income.new })).toBeInTheDocument();
  });
});

describe("PlanView", () => {
  it("separates the month's adjustments from the global template", async () => {
    render(await PlanView({ month: "2026-09" }));

    expect(screen.getByRole("tab", { name: "Septiembre 2026" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: content.budget.templateTab })).toBeInTheDocument();
  });

  it("plans each category", async () => {
    render(await PlanView({ month: "2026-09" }));

    expect(screen.getByLabelText("Arriendo")).toBeInTheDocument();
  });

  it("loads through the current month when browsing an earlier one, so the template sees today's repeating expenses", async () => {
    await PlanView({ month: "2020-01" });

    expect(loadPlanData).toHaveBeenCalledWith(currentMonthKey(new Date()));
  });

  it("loads through a later month when that is the one being browsed", async () => {
    await PlanView({ month: "2999-12" });

    expect(loadPlanData).toHaveBeenCalledWith("2999-12");
  });
});

describe("SettingsPage", () => {
  it("shows the profile and the household", async () => {
    render(await SettingsPage());

    expect(screen.getByLabelText(content.settings.displayName)).toHaveValue("Julián");
    expect(screen.getByLabelText(content.settings.householdName)).toHaveValue("Nuestra casa");
  });

  it("lists the household's own reference data", async () => {
    render(await SettingsPage());

    expect(screen.getByText("Bancolombia")).toBeInTheDocument();
    expect(screen.getByText(content.settings.categories)).toBeInTheDocument();
    expect(screen.getByText(content.settings.incomeSources)).toBeInTheDocument();
  });

  it("copes with a member it cannot find a profile for", async () => {
    vi.mocked(requireHouseholdContext).mockResolvedValue({ ...context, members: [] });

    render(await SettingsPage());

    expect(screen.getByLabelText(content.settings.displayName)).toHaveValue("");
  });
});
