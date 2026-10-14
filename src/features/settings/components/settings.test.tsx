import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { content } from "@/content/es";
import {
  saveCategory,
  saveHousehold,
  saveIncomeSource,
  savePaymentMethod,
  saveProfile,
} from "@/features/settings/actions";
import { successState } from "@/lib/actions/state";
import {
  GF,
  JULIAN,
  makeCategory,
  makeCreditCard,
  makeIncomeTemplateAmount,
  makeIncomeTemplateItem,
  makePaymentMethod,
} from "@/test/factories";

import { CategorySheet } from "./category-sheet";
import { GeneralSettings } from "./general-settings";
import { IncomeSourceSheet } from "./income-source-sheet";
import { PaymentMethodSheet } from "./payment-method-sheet";
import { ReferenceData } from "./reference-data";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/settings/actions", () => ({
  savePaymentMethod: vi.fn(async () => successState("Listo")),
  saveCategory: vi.fn(async () => successState("Listo")),
  saveIncomeSource: vi.fn(async () => successState("Listo")),
  saveProfile: vi.fn(async () => successState("Listo")),
  saveHousehold: vi.fn(async () => successState("Listo")),
}));

const accounts = [{ value: "bank", label: "Bancolombia · Julián" }];

const memberOptions = [
  { value: JULIAN, label: "Julián" },
  { value: GF, label: "GF" },
];

describe("GeneralSettings", () => {
  const renderSettings = () =>
    render(<GeneralSettings displayName="Julián" householdName="Nuestra casa" />);

  it("starts from the values already stored", () => {
    renderSettings();

    expect(screen.getByLabelText(content.settings.displayName)).toHaveValue("Julián");
    expect(screen.getByLabelText(content.settings.householdName)).toHaveValue("Nuestra casa");
  });

  it("has no household-wide split any more — each shared expense carries its own", () => {
    renderSettings();

    expect(screen.getAllByRole("button", { name: content.common.save })).toHaveLength(2);
  });

  it("renames only the signed-in user", async () => {
    renderSettings();

    const forms = screen.getAllByRole("button", { name: content.common.save });
    await userEvent.click(forms[0] as HTMLElement);

    await waitFor(() => expect(saveProfile).toHaveBeenCalled());
    expect(vi.mocked(saveProfile).mock.calls.at(0)?.[1]?.get("display_name")).toBe("Julián");
  });

  it("renames the household", async () => {
    renderSettings();

    const forms = screen.getAllByRole("button", { name: content.common.save });
    await userEvent.click(forms[1] as HTMLElement);

    await waitFor(() => expect(saveHousehold).toHaveBeenCalled());
  });
});

describe("PaymentMethodSheet", () => {
  const openNew = async () => {
    render(<PaymentMethodSheet members={memberOptions} />);
    await userEvent.click(screen.getByRole("button", { name: content.common.add }));
  };

  it("hides the card fields until the type is a credit card", async () => {
    await openNew();

    expect(screen.queryByLabelText(content.settings.creditLimit)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("combobox", { name: content.settings.methodType }));
    await userEvent.click(
      screen.getByRole("option", { name: content.paymentMethodType.credit_card }),
    );

    expect(screen.getByLabelText(content.settings.creditLimit)).toBeInTheDocument();
    expect(screen.getByLabelText(content.settings.closingDay)).toBeInTheDocument();
    expect(screen.getByLabelText(content.settings.defaultRate)).toBeInTheDocument();
  });

  it("loads an existing card for editing, cycle and rate included", async () => {
    const card = makeCreditCard({
      name: "TC1",
      user_id: JULIAN,
      credit_limit: 5_000_000,
      closing_day: 15,
      due_day: 5,
      default_annual_rate_percent: 28.5,
    });

    render(<PaymentMethodSheet members={memberOptions} method={card} />);
    await userEvent.click(screen.getByRole("button", { name: content.common.edit }));

    expect(screen.getByLabelText(content.settings.methodName)).toHaveValue("TC1");
    expect(screen.getByLabelText(content.settings.creditLimit)).toHaveValue("5000000");
    expect(screen.getByLabelText(content.settings.defaultRate)).toHaveValue("28.5");
  });

  it("carries the row id so an edit updates rather than inserts", async () => {
    const method = makePaymentMethod({ id: "method-x", user_id: JULIAN });

    render(<PaymentMethodSheet members={memberOptions} method={method} />);
    await userEvent.click(screen.getByRole("button", { name: content.common.edit }));
    await userEvent.click(screen.getByRole("button", { name: content.common.save }));

    await waitFor(() => expect(savePaymentMethod).toHaveBeenCalled());
    expect(vi.mocked(savePaymentMethod).mock.calls.at(0)?.[1]?.get("id")).toBe("method-x");
  });

  it("treats a new method as active", async () => {
    await openNew();

    expect(screen.getByRole("switch", { name: content.settings.methodActive })).toBeChecked();
  });
});

describe("CategorySheet", () => {
  it("places a new category at the end of the list", async () => {
    render(<CategorySheet nextSortOrder={100} />);

    await userEvent.click(screen.getByRole("button", { name: content.common.add }));
    await userEvent.type(screen.getByLabelText(content.settings.categoryName), "Mascotas");
    await userEvent.click(screen.getByRole("button", { name: content.common.save }));

    await waitFor(() => expect(saveCategory).toHaveBeenCalled());
    expect(vi.mocked(saveCategory).mock.calls.at(0)?.[1]?.get("sort_order")).toBe("100");
  });

  it("keeps an existing category where it already sits", async () => {
    const category = makeCategory({ id: "rent", name: "Arriendo", sort_order: 10 });

    render(<CategorySheet category={category} nextSortOrder={100} />);
    await userEvent.click(screen.getByRole("button", { name: content.common.edit }));

    expect(screen.getByLabelText(content.settings.categoryName)).toHaveValue("Arriendo");

    await userEvent.click(screen.getByRole("button", { name: content.common.save }));
    await waitFor(() => expect(saveCategory).toHaveBeenCalled());
    expect(vi.mocked(saveCategory).mock.calls.at(0)?.[1]?.get("sort_order")).toBe("10");
  });

  it("offers archiving rather than deleting", async () => {
    render(<CategorySheet nextSortOrder={0} />);
    await userEvent.click(screen.getByRole("button", { name: content.common.add }));

    expect(
      screen.getByRole("switch", { name: content.settings.categoryArchived }),
    ).toBeInTheDocument();
  });
});

describe("IncomeSourceSheet", () => {
  it("defaults a new source to the signed-in user", async () => {
    render(<IncomeSourceSheet members={memberOptions} accounts={accounts} defaultUserId={GF} />);
    await userEvent.click(screen.getByRole("button", { name: content.common.add }));

    expect(
      screen.getByRole("combobox", { name: content.settings.incomeSourceOwner }),
    ).toHaveTextContent("GF");
  });

  it("asks where the income lands, and starts with no account", async () => {
    render(<IncomeSourceSheet members={memberOptions} accounts={accounts} defaultUserId={GF} />);
    await userEvent.click(screen.getByRole("button", { name: content.common.add }));

    expect(
      screen.getByRole("combobox", { name: content.settings.incomeSourceAccount }),
    ).toHaveTextContent(content.income.noAccount);
  });

  it("offers only the accounts it is given, which never include a credit card", async () => {
    render(<IncomeSourceSheet members={memberOptions} accounts={accounts} defaultUserId={GF} />);
    await userEvent.click(screen.getByRole("button", { name: content.common.add }));
    await userEvent.click(
      screen.getByRole("combobox", { name: content.settings.incomeSourceAccount }),
    );

    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      content.income.noAccount,
      "Bancolombia · Julián",
    ]);
  });

  it("shows the account an existing source lands in", async () => {
    const source = makeIncomeTemplateItem({ label: "Nómina", payment_method_id: "bank" });

    render(
      <IncomeSourceSheet
        members={memberOptions}
        accounts={accounts}
        source={source}
        defaultUserId={JULIAN}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: content.common.edit }));

    expect(
      screen.getByRole("combobox", { name: content.settings.incomeSourceAccount }),
    ).toHaveTextContent("Bancolombia · Julián");
  });

  it("loads an existing source for editing", async () => {
    const source = makeIncomeTemplateItem({ label: "Nómina", amount: 4_500_000, user_id: JULIAN });

    render(
      <IncomeSourceSheet
        members={memberOptions}
        accounts={accounts}
        source={source}
        defaultUserId={JULIAN}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: content.common.edit }));

    expect(screen.getByLabelText(content.settings.incomeSourceLabel)).toHaveValue("Nómina");
    expect(screen.getByLabelText(content.settings.incomeSourceAmount)).toHaveValue("4500000");
  });

  it("sends the new source to the action", async () => {
    render(
      <IncomeSourceSheet members={memberOptions} accounts={accounts} defaultUserId={JULIAN} />,
    );

    await userEvent.click(screen.getByRole("button", { name: content.common.add }));
    await userEvent.type(screen.getByLabelText(content.settings.incomeSourceLabel), "Nómina");
    await userEvent.type(screen.getByLabelText(content.settings.incomeSourceAmount), "4500000");
    await userEvent.click(screen.getByRole("button", { name: content.common.save }));

    await waitFor(() => expect(saveIncomeSource).toHaveBeenCalled());
    expect(vi.mocked(saveIncomeSource).mock.calls.at(0)?.[1]?.get("label")).toBe("Nómina");
  });
});

describe("ReferenceData", () => {
  const renderReference = () =>
    render(
      <ReferenceData
        paymentMethods={[
          makePaymentMethod({ id: "bank", name: "Bancolombia", user_id: JULIAN }),
          makeCreditCard({
            id: "card",
            name: "TC1",
            user_id: GF,
            credit_limit: 5_000_000,
            active: false,
          }),
        ]}
        categories={[
          makeCategory({ id: "rent", name: "Arriendo", sort_order: 10 }),
          makeCategory({ id: "old", name: "Viejo", archived: true, sort_order: 20 }),
        ]}
        incomeSources={[
          makeIncomeTemplateItem({ id: "payroll", label: "Nómina", user_id: JULIAN }),
          makeIncomeTemplateItem({ id: "old-job", label: "Viejo", active: false, user_id: GF }),
        ]}
        incomeAmounts={[
          makeIncomeTemplateAmount({
            template_item_id: "payroll",
            effective_from: "2026-01-01",
            amount: 4_800_000,
          }),
        ]}
        currentMonth="2026-09"
        memberOptions={memberOptions}
        memberNames={
          new Map([
            [JULIAN, "Julián"],
            [GF, "GF"],
          ])
        }
        currentUserId={JULIAN}
      />,
    );

  it("lists payment methods with their type and owner", () => {
    renderReference();

    expect(screen.getByText("Bancolombia")).toBeInTheDocument();
    expect(
      screen.getByText(`${content.paymentMethodType.bank_account} · Julián`),
    ).toBeInTheDocument();
  });

  it("marks what has been deactivated or archived rather than hiding it", () => {
    renderReference();

    expect(screen.getByText(content.settings.methodInactive)).toBeInTheDocument();
    expect(screen.getByText(content.settings.categoryArchived)).toBeInTheDocument();
    expect(screen.getByText(content.settings.incomeSourceInactive)).toBeInTheDocument();
  });

  it("shows a card's limit and a source's expected amount", () => {
    renderReference();

    expect(screen.getByText("$ 5.000.000")).toBeInTheDocument();
    expect(screen.getAllByText("$ 4.000.000").length).toBeGreaterThan(0);
  });

  it("shows a source at its amount from this month on, not the one it started with", () => {
    renderReference();

    // The payroll started at 4.000.000 and changed to 4.800.000 in January.
    expect(screen.getByText("$ 4.800.000")).toBeInTheDocument();
  });

  it("says where each income source lands", () => {
    renderReference();

    expect(screen.getByText(`Julián · ${content.income.noAccount}`)).toBeInTheDocument();
  });

  it("offers an edit for every row and an add for every section", () => {
    renderReference();

    expect(screen.getAllByRole("button", { name: content.common.edit })).toHaveLength(6);
    expect(screen.getAllByRole("button", { name: content.common.add })).toHaveLength(3);
  });

  it("says so when a section is empty", () => {
    render(
      <ReferenceData
        paymentMethods={[]}
        categories={[]}
        incomeSources={[]}
        incomeAmounts={[]}
        currentMonth="2026-09"
        memberOptions={memberOptions}
        memberNames={new Map()}
        currentUserId={JULIAN}
      />,
    );

    expect(screen.getByText(content.settings.paymentMethodsEmpty)).toBeInTheDocument();
    expect(screen.getByText(content.settings.categoriesEmpty)).toBeInTheDocument();
    expect(screen.getByText(content.settings.incomeSourcesEmpty)).toBeInTheDocument();
  });
});
