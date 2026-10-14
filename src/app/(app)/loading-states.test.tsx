import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { content } from "@/content/es";

import BudgetLoading from "./budget/loading";
import DashboardLoading from "./dashboard/loading";
import ExpensesLoading from "./expenses/loading";
import IncomeLoading from "./income/loading";
import SettingsLoading from "./settings/loading";

describe("route loading states", () => {
  it("gives every section a loading state that names the page being opened", () => {
    for (const [Loading, title] of [
      [ExpensesLoading, content.expenses.title],
      [IncomeLoading, content.income.title],
      [BudgetLoading, content.budget.title],
      [SettingsLoading, content.settings.title],
    ] as const) {
      const { unmount } = render(<Loading />);

      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(title);
      expect(screen.getByRole("status")).toHaveTextContent(content.common.loading);
      unmount();
    }
  });

  it("gives the dashboard one too, before it knows whom to greet", () => {
    render(<DashboardLoading />);

    expect(screen.getByRole("status")).toHaveTextContent(content.common.loading);
  });
});
