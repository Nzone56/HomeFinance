@AGENTS.md

# Finanzas en casa

A private shared-finance app for one household of two people. Deployed to a
private Vercel URL; there is no public surface and no marketing page.

**The priority order is: simplicity → correct financial logic → security →
maintainability → UI polish.** When two of these conflict, the earlier one wins.

---

## 1. Stack

| Concern      | Choice                                                     |
| ------------ | ---------------------------------------------------------- |
| Framework    | Next.js 16 (App Router, Turbopack), React 19               |
| Language     | TypeScript, `strict` + `noUncheckedIndexedAccess`          |
| Styling      | Tailwind v4, shadcn/ui (`radix-nova` preset, neutral base) |
| Backend      | Supabase — Auth, Postgres, RLS, Realtime                   |
| Validation   | Zod v4                                                     |
| Client state | Zustand (only where it earns its place — see §6)           |
| Dates        | date-fns                                                   |
| Testing      | Vitest + React Testing Library, 100% coverage gate         |
| Theme        | next-themes (`class` attribute)                            |

Do not add dependencies without a concrete need. No Redux. No React Query —
server components already fetch, and nothing here needs a client cache.

---

## 2. Language rule (non-negotiable)

- **All code is English.** Variables, functions, types, files, DB tables and
  columns, comments, test names, commit messages.
- **All UI is Spanish.** Every visible string lives in `src/content/es.ts` —
  never inline in a component. That module is the seam a real i18n library
  would slot into later.
- Spanish copy should be idiomatic and short. Verb-first CTAs.

---

## 3. Architecture

```
Browser ──▶ proxy.ts (session refresh + redirect)
        ──▶ Server Component ──▶ Supabase (user's JWT) ──▶ Postgres + RLS
        ──▶ Server Action    ──▶ Supabase (user's JWT) ──▶ Postgres + RLS
```

- **Reads** happen in Server Components via `createServerSupabaseClient()`.
  Never fetch initial data from a client `useEffect`.
- **Navigation never waits for data.** Measured before this rule: a click sat
  for 1–1.4s with nothing on screen. Three things keep it instant, and all three
  are load-bearing:
  - `(app)/layout.tsx` awaits nothing. The household name and the member's mark
    stream in through `shell-identity.tsx` behind their own `<Suspense>`. A
    layout that awaits blocks every navigation and stops `loading.tsx` from
    ever showing.
  - Every route has a `loading.tsx` (a `PageSkeleton`). Next prefetches it, so a
    click paints the skeleton with no round trip.
  - A month-dependent page only reads `searchParams` and renders its
    `<feature>View` inside `<Suspense key={month}>`. Changing only the query
    string never shows `loading.tsx`; the key is what makes a month switch show
    the skeleton immediately instead of freezing on the old month.
- **Fetch in parallel, never in sequence.** A view awaits
  `Promise.all([requireHouseholdContext(), loadXData(month)])` — RLS scopes the
  data, so it has no reason to wait for the household.
- **Writes** are Server Actions in `src/features/<feature>/actions.ts`.
- **A save and the reload after it are separate.** `mutate` does not call
  `revalidatePath`: inside an action it re-renders the page in the same
  response as the write, and a Supabase gateway timeout during that render
  reported a card payment that had saved as a failed save. `ActionFeedback`
  calls `router.refresh()` once the success is in, and a failed reload lands on
  `(app)/error.tsx`, which says the save is safe. Auth actions still revalidate
  — they change who is signed in, not a row.
- **Realtime** is one client component that calls `router.refresh()` on any
  household change. It never carries the payload into client state — Supabase
  stays the single source of truth.
- `proxy.ts` (not `middleware.ts` — renamed in Next 16) refreshes the session
  cookie and redirects. It is **convenience, not security**.

### Folders

```
src/
  app/                 routes; (app)/ is the authenticated segment
  components/
    form/              ActionForm, ActionSheet, fields, SubmitButton
    layout/            AppShell, MainNav, MonthSwitcher, RealtimeRefresh
    charts/            Meter, ProgressRing, DonutChart, GroupedBars
    money/             Amount
    people/            MemberAvatar
    theme/             ThemeProvider, ThemeToggle
    ui/                vendored shadcn — DO NOT EDIT, DO NOT TEST
  content/es.ts        every user-facing string
  features/<f>/        actions.ts, components/, lib/
  lib/
    actions/           ActionState, mutate()
    calculations/      pure domain functions — the heart of the app
    data/              Supabase reads
    dates/, format/, supabase/, ui/
  schemas/             Zod, field builders in fields.ts
  test/                setup + factories + Supabase double
  types/database.ts    hand-written mirror of supabase/migrations
supabase/migrations/   numbered, append-only
```

---

## 4. Security

**Row Level Security is the authorization boundary. Nothing else is.**

- The app only ever talks to Supabase with the **caller's own JWT**. The
  `service_role` key must never appear in this application.
- Every table has RLS. Policies go through `public.is_household_member()` /
  `public.shares_household_with()`, both `SECURITY DEFINER` with a pinned
  `search_path` so a policy on `household_members` cannot recurse into itself.
- Queries in `src/lib/data/` deliberately carry **no `household_id` filter** —
  RLS scopes them. A bug there cannot leak another household's data.
- Each page loads only the tables it renders (`loadDashboardData`,
  `loadMovementsData`, `loadIncomePageData`, `loadPlanData`,
  `loadSettingsData`). The slice types are `Pick`ed from `FinanceData` so the
  shape is defined once. `/settings` reads no transactions at all; `/budget` reads expenses only so the repeating ones can plan their categories.
- `is_household_member` and `shares_household_with` stay in `public`, which
  means PostgREST advertises them as RPCs to signed-in users. That is accepted
  and understood: both answer only about the **caller's own** memberships, so
  neither is an oracle for anyone else's data, and an RLS policy can only call
  a function the calling role may execute. Supabase's linter flags them; moving
  them to a `private` schema would silence it at the cost of rewriting every
  policy. Do not "fix" this without weighing that.
- A Server Action never takes `household_id` from the form. It comes from
  `requireHouseholdContext()`, i.e. from the session. See `mutate()`.
- Every authenticated page calls `requireHouseholdContext()` itself. Do not
  rely on the proxy having run.
- **Sessions are verified with `getClaims()`, never `getUser()`,** in the proxy
  and in `getHouseholdContext`. The project signs tokens with ES256, so
  `getClaims` checks the signature locally against signing keys auth-js caches
  process-wide for ten minutes. `getUser` was a round trip to Supabase Auth on
  every request, prefetches included — measured at most of the proxy's
  400–500ms. PostgREST authorizes each query by that same token, so nothing is
  lost. Do not use `getSession()` for identity: it trusts the cookie.
- Auth is email + password, signups disabled, both users invited from the
  dashboard. The sign-in failure message is identical for unknown email and
  wrong password, so it cannot be used to discover who has an account.
- `noindex` via both route metadata and an `X-Robots-Tag` header.
- Secrets live in `.env.local` (gitignored). Only `NEXT_PUBLIC_*` reach the
  browser, and they are safe to.

---

## 5. Money and domain rules

- **Amounts are integers of whole COP pesos, in `bigint` columns.** The peso is
  the smallest unit. Never a float, never a numeric money column.
- `parseAmountInput` reads `1.500.000`, `$1.500.000` and `1500000`. It
  **rejects** a minus sign rather than stripping it — silently turning `-5000`
  into `5000` is a data change nobody asked for.
- Splits use `splitByWeights` (largest remainder), so shares always add back up
  to the total. No lost pesos.
- **Months** are `yyyy-MM` keys everywhere in the app; the database stores the
  first of the month as a `date`.
- **Three kinds of transaction, and the distinction is load-bearing:**
  - `expenses` — money leaving for goods/services.
  - `incomes` — money arriving.
  - `transfers` — money moving between payment methods. Paying off a credit
    card is a transfer, **never** an expense. This is what stops card spending
    being counted twice.
- **Who paid** (`user_id`) and **how** (`payment_method_id`) are independent.
- **A shared expense is spending for both, split by its own percentage.**
  `payer_share_percent` (0–100, default 50) is the payer's part; the other
  member carries the rest. Each person's spending is their personal expenses
  plus their part of every shared one — `chargesFor` / `buildMemberSpend` in
  `split.ts`, through `splitByWeights` so no peso is lost.
- **Nobody owes anybody.** There is no settlement, no "le debe", no balance
  between the two: paying a shared bill with your card does not make the other
  person your debtor. Do not reintroduce one. `household_members.share_weight`
  still exists in the database but the app no longer reads it.
- **`shared`** decides both how an expense divides and what counts as household
  (rather than personal) spending. One flag, so the two views can never
  disagree.
- **`active = false`** hides an expense from every calculation while keeping the
  record. Nothing is ever silently dropped from a total for another reason.
- **Plan = dated template + sparse month overrides, and it never reaches
  backwards.** A plan applies from the month it is made onward; months already
  gone keep what they expected.
  - `budget_template_items` rows are **versions**: each applies from its
    `effective_from` month until a later one for the same category. Saving the
    template writes the current month's version. Planned for (month, category)
    is `override ?? latest version in effect ?? 0`.
  - An income source starts on `starts_on` (the month it was created) and is
    not expected before it. Its `amount` is what it started with; a later change
    is an `income_template_amounts` row from the current month
    (`writeIncomeBaseline`). Expected is `override ?? latest change ?? amount`.
  - A month matching the plan stores **zero rows** of overrides.
  - **Repeating expenses plan themselves.** `recurringByCategory` sums each
    category's active expenses with `repeat_months` for the month — their share,
    exactly as actual spending counts them — and `addPlanned` adds that on top of
    the typed plan. Typed amounts are what is planned _besides_ them (groceries,
    the variable part); a month override changes only the typed part. Nobody
    types Netflix into the plan as well as into the expenses. The same note shows on
    both tabs: the month tab for its month, the template for the current month
    (so `PlanView` loads expenses through whichever of the two is later).
- **Expected is not received.** The plan never counts as money arrived — the
  dashboard's real income is only recorded `incomes`. "Marcar como recibido"
  (`receiveExpectedIncome`) turns an expected source into a recorded income in
  one click, copying the month's expected amount, the person and the account,
  and setting `incomes.template_item_id` so a month shows it received once.
  It is resolved entirely on the server; the form carries only source and month.
- **Income lands in an account, never on a credit card.** Sources carry an
  optional `payment_method_id`; `isCreditCard` refuses a card on save and the
  option lists leave cards out.
- **Credit cards**: debt is `opening_debt + purchases + cash advances − payments`.
  `opening_debt` is what the card owed before the app knew about it, entered
  once in Ajustes and leaving out purchases already recorded here. Without it a
  real statement payment drove the debt below zero, because the app only knew
  the purchases recorded since.
- **A card has two bills open, on two dates.** The statement that last closed
  is due on its own due date; the cycle building up now is due on the next.
  A card closing on the 13th and due on the 3rd owes what closed on 13 sep by
  3 oct, and what it charges from the 14th to 13 oct by 3 nov. A payment
  settles the closed statement before it counts toward the new cycle.
  `buildCreditCardStatus` returns both (`statement`, `cycleOwed`) and
  `UpcomingPayments` lists both, marking an unpaid statement past its date
  `Vencido`. All the debt used to sit against the later date.
- **Card debt counts every charge of a repeating purchase**, through the viewed
  month, at full principal (`cardChargesUpToMonth`). Counted once, a monthly
  subscription stopped adding to the debt after its first month. Closing and
  due days are stored as given (1–31) and clamped to the real month length, so
  a card closing on the 31st still works in February.

### Expenses that reach beyond their own month

Two independent dials on `expenses`, which compose:

- `installments` — spread ONE amount across N consecutive months. A water bill
  covering two months counts half in each. On a credit card this is a purchase
  _a cuotas_, and `annual_rate_percent` (%EA) adds the bank's interest via a
  standard annuity. %EA converts to a monthly rate by the **twelfth root**, not
  by dividing by twelve. The form asks for the %EA only on a card with more than
  one cuota — a single cuota has no interest, and the schema refuses a rate on it.
- `repeat_months` — repeat the SAME amount every N months, for bills you
  already know: rent, subscriptions. `repeat_until` ends it.

The water bill uses both: it arrives every two months _and_ covers two months.

**The deliberate asymmetry:** a cuotas purchase contributes its monthly cuota to
each month's _expenses_ and to each person's part of it, but the card's _debt_ counts
the full principal, because the bank charged all of it at once.

---

## 6. Conventions

- Server Components by default. `"use client"` only for interactivity.
- **Anything you can click says so.** Every control carries `cursor: pointer`
  and every disabled one `cursor: not-allowed` — Tailwind v4's Preflight sets
  `cursor: default` on buttons, which is why this has to be said at all. The
  rule lives **once**, in the base layer of `globals.css`, and covers roles as
  well as tags so Radix primitives that render a `div` are included. Do not add
  `cursor-pointer` to a component: if something you can click is missing the
  pointer, the selector list in `globals.css` is what needs widening.
- **Forms**: `ActionForm` (inline) or `ActionSheet` (responsive panel). Both
  hand the render prop a `fields` factory — spread it: `<TextField label="Monto"
{...fields("amount")} />`. It wires the name, the error and the value to
  restore.
- **`ActionSheet` is a drawer on a phone and a dialog on a desktop.** A
  full-width bottom drawer on a wide screen is a column of fields marooned in an
  empty panel. Both halves render the identical form, the fields scroll and the
  header and save button stay put, so a long form never hides its own submit
  button. The breakpoint comes from `useMediaQuery`, whose server snapshot is
  `false` — safe only because neither panel renders anything until it is opened.
- **A form that creates can usually edit.** `ExpenseSheet` takes an optional
  `expense` and switches action, title, trigger and every default from it. The
  row id travels in a hidden field; the household never does, because `mutate`
  takes it from the session and RLS refuses the write otherwise.
- **A list row shows what you scan for; everything else is one click down.**
  `ExpenseRow` keeps notes, cuotas, the %EA and the repeat in a panel underneath
  so a bimonthly bill can explain itself without every other row paying for the
  space. Rows that reveal detail use a real `button` with `aria-expanded` and
  `aria-controls`.
- **React clears an uncontrolled form once its action resolves.** Actions
  therefore echo the submitted values back (`formValues`), and fields restore
  them. Without this a failed save wipes everything the user typed.
- **Do not submit a form programmatically to fire an action.** It fires twice.
  Build `FormData` and call the action inside `startTransition` — see
  `ExpenseActiveToggle`, which was the bug that taught us this.
- **`ActionSheet` dispatches from `onSubmit`, never `<form action>`.** React
  resets a form after a form action finishes — a rejected one too — and Radix's
  Select and Switch answer that reset by snapping back to the value they
  mounted with. A failed save silently reverted every dropdown and toggle while
  the text fields came back, which read as "it erased some lines". Build
  `FormData` in `onSubmit`, call the action in `startTransition`, and pass
  `useActionState`'s pending flag to `SubmitButton`. A rejection focuses the
  first `aria-invalid` field so its message is in view, not above the fold.
- Field names mirror database columns, so a parsed schema can go straight to an
  insert with no mapping layer.
- URL owns view state: the selected month is `?month=yyyy-MM`, read on the
  server and by `useSelectedMonth` on the client.
- **The dashboard opens by greeting whoever is looking at it**, with a status
  pill that reads the plan (`Todo al día` / `Cerca del plan` / `Sobre el plan`)
  and the month beside it. Any month other than the current one says which way
  you wandered and offers one click back; the month switcher grows the same
  shortcut. Every other page keeps its quieter heading.
- **The dashboard reads in the order you would ask.** `HeadlineCards` first —
  income, expenses, what is left, and what the household spent together. Then the month planned
  against actual and where the money went, then the plan category by category
  beside the ring, then the accounts, then the movements themselves. The
  six-month trend is **last**: it is context for the month, not the month
  itself. A new card goes where the question it answers belongs in that
  sequence, not at the top.
- **A chart of a number that does not exist is worse than no chart.** With
  no income recorded, `SpendingVsIncome` drops the ring entirely and shows what has
  actually gone out plus the one action that would fix it. Apply the same test
  to any empty state: show the real figure, not an empty shape.
- **Zustand** is for UI state that genuinely spans components. Do not reach for
  it when `useState` or the URL will do.
- Reference data is **archived or deactivated, never deleted** — expenses point
  at it and history must stay readable.
- Prefer a `variant` prop over duplicating a component (`MainNav` renders both
  the desktop bar and the mobile tab bar).
- No `any`. No `unknown` leaking into app code. No ignored TS errors.
- Avoid `?? 0` on indexed access — under `noUncheckedIndexedAccess` it creates a
  branch that can never be covered. Restructure with `map`/`reduce`/`Map`.
- Tailwind: theme tokens, no arbitrary values, `bg-linear-to-r` not
  `bg-gradient-to-r`. The app's content width is `max-w-app` (1200px,
  `--container-app` in `globals.css`), used by every container in `AppShell`.
- **Motion is one keyframe, applied by the container.** `appear` fades and
  lifts a single element; `appear-children` does the same to a container's own
  children, staggered by `nth-child` in CSS. No component takes a delay prop and
  none knows it is being animated — the stagger belongs to the list, not to the
  things in it. The offset stops at the eighth item. A blanket
  `prefers-reduced-motion` rule in `globals.css` switches off **every** animation
  in the app, Radix's and sonner's included, so nothing new has to remember to.
- **Nothing large animates `transform: scale` or sits behind a
  `backdrop-filter`.** The desktop dialog used the vendored `zoom-in-95` over a
  blurred full-screen scrim: scaling re-rasterizes every field each frame and
  the blur re-samples the whole viewport, so its contents visibly lagged its
  frame on desktop while the phone sheet (a translate over a small area) felt
  smooth. `ActionSheet`'s dialog uses `animate-dialog-in` — the `appear`
  keyframe, 160ms — and closes without an exit animation; the dialog overlay is
  a plain dim (both in `globals.css`). Animate opacity and translate only.

---

## 7. Charts and colour

Colour carries meaning here; it is not decoration. Three reserved roles:

- **Categorical** (`--chart-1`…`--chart-5`, via `seriesColor`) — identity. Slots
  are assigned in fixed order and **never cycled into new hues**: a series keeps
  its slot however many are on screen, so filtering one out never repaints the
  rest. The order is the colour-blind-safety mechanism, not taste — the set was
  validated against both card surfaces for lightness band, chroma floor, CVD
  separation and normal-vision separation. **Re-run that validation before
  changing any of these hexes.**
- **Status** (`--status-good|warning|critical`, via `spendStatus`/`statusFill`) —
  state. A red meter always means "over", never "series 4". Always paired with a
  label or a figure.
- **Chrome** (`--chart-grid`, `--chart-axis`) — recessive. Hairline, solid.

**People are a categorical series.** `buildMemberColors` assigns each member a
slot **by household order**, not by a hash of their id and not by their rank in
whatever list is on screen. That one map is why the avatar beside a name, the
bar in "gastos de cada uno" and each person's ring all agree. `MemberAvatar`
paints the slot as a ring and a 20% tint with the initials in foreground ink —
the palette is tuned for marks on a card surface, not as a backdrop for white
text. The avatar is `aria-hidden` wherever the name is already on screen beside
it; pass `labelled` only when the mark stands alone.

Chart rules, all currently honoured:

- **One y-scale, never two.** Two measures of different scale become two charts.
- Marks are thin: 2px lines, ≤24px bars, ≥8px markers with a 2px surface ring,
  a 2px surface gap between touching segments. Never a border to separate marks.
- **A legend is always present for two or more series**, plus sparing direct
  labels — never a number on every point.
- **Text never wears the series colour.** Identity comes from a coloured mark
  beside the text; labels use text tokens.
- Every chart ships a hover tooltip and an `sr-only` table of the same figures.
- **A category is one colour across the whole page.** `buildCategoryColors`
  assigns slots from `buildCategoryShares` — by spend, largest first — and the
  page builds that map once and hands it to the donut and the movements table
  alike. Categories past `CATEGORY_SLICE_LIMIT` fold into one `Otros` row in
  chrome rather than being given a generated hue, which under colour blindness
  would be indistinguishable from a slice already on screen. The same rule
  covers people: see `buildMemberColors`.
- **The headline cards wear categorical colour, not status colour.** Income is
  not green because it is good — it is green because it is income, and it stays
  green in a month that went badly. That is what keeps red free to mean "over
  the plan" and nothing else.
- **The rings answer the same question at two altitudes: how much of what came
  in has already gone.** `SpendingVsIncome` asks it of the household and
  `PersonSummaries` of each person. Income is recorded income only — expected
  is not received. The plan is judged by `PlanVsActual` beside the ring and the
  greeting's pill, not by a ring. Both wear a **status** colour because both measure a state
  against a limit; identity comes from the avatar beside the ring. A person's
  "sus gastos" is their part of the month — personal expenses plus their
  percentage of every shared one — never what happened to go through their
  card.
- **A reference marker is not a second series.** The tick on `ProgressRing`
  showing how far through the month we are wears chrome ink, carries its own
  `<title>`, and is explained in words beneath the ring. It is the thing that
  makes the percentage readable — 60% spent is unremarkable on the 27th and
  alarming on the 9th — and `monthProgress` is where that number comes from.
- Charts are hand-rolled inline SVG. No chart library — the forms needed here are
  simple and a dependency would cost more than it saves on a PWA.
- SVG `<text>` scales with the viewBox and balloons on a wide screen. Axis labels
  live in HTML, positioned by percentage to line up with their points —
  `GroupedBars` goes further and is built in HTML entirely, for the same reason.
- **A bar chart's zero line is drawn, not implied.** `buildBarScale` always keeps
  zero inside the range, so a negative "Disponible" hangs below the line instead
  of being flattened into a short bar, and every bar stays proportional to its
  own value.

## 8. Testing

**100% statements, branches, functions and lines. The suite fails below that.**

Documented exclusions (and only these):

- `src/**/*.d.ts`, `src/**/*.test.*`, `src/test/**` — no runtime code.
- `src/types/**` — type-only, erased at compile time.
- `src/components/ui/**` — vendored shadcn source, generated by its CLI and not
  edited by hand.

Rules:

- Reads go through `rowsOf` / `maybeRowOf`, which retry **up to twice**, with a short backoff, when the REST
  gateway — not Postgres — fails. A `Gateway Timeout` on a query Postgres
  answered in milliseconds used to put the whole dashboard behind the error
  boundary. Errors carrying a SQLSTATE (`permission denied`, a constraint) are
  never retried, and a write is never retried at all.
- Every financial calculation gets thorough unit tests: zero values, empty sets,
  multiple users, month and year boundaries, rounding, negatives.
- Test **behaviour**, not implementation. No tests written purely to move the
  number.
- Security-sensitive paths test both authorized and unauthorized access.
- Supabase is mocked by `src/test/supabase-mock.ts`, which records every query
  so an action test can assert the household came from the session.
- Test names are English sentences describing the behaviour.
- When a bug is found, the fix ships with a regression test that names the bug.

---

## 9. Deployment

Vercel free tier. No long-running processes, no background workers, no custom
server, no in-memory state. Supabase owns data, auth and realtime.

PWA: `app/manifest.ts` plus a ~50-line service worker that caches **static
assets only**. Financial data is never cached — a stale balance on one device
would be worse than no app. Icons are generated from `public/icons/icon.svg` by
`scripts/generate-icons.mjs` (a one-off dev utility; the PNGs are committed).

---

## 10. Working on this repo

- Read the Next.js docs in `node_modules/next/dist/docs/` before using an API
  you are unsure about. This version has breaking changes.
- Migrations are numbered and append-only. Apply them to Supabase **and** keep
  `src/types/database.ts` in step — they must travel in the same commit.
- Row types in `database.ts` must be `type` aliases, not `interface`.
  postgrest-js requires `Record<string, unknown>` and interfaces do not get an
  implicit index signature — every row silently resolves to `never` otherwise.
- After adding a column, PostgREST may need `notify pgrst, 'reload schema'`.
- **Check authenticated pages signed in, and read the console.** The preview
  opens on `/login`; the test account lives in `CLAUDE.local.md` (gitignored —
  credentials never go in this file). A page that looks right can still throw a
  console error that a real browser's dev overlay shows.
- `next-themes` renders an inline `<script>`, which React 19 warns about on the
  client. `ThemeProvider` passes `scriptProps` that make it inert JSON on the
  client only; the server HTML keeps the executable script. Do not remove it.
- Before calling anything done: `npm run verify` (typecheck → lint → coverage →
  build) must pass.
- **localhost:3000 belongs to `next dev`.** A production check (`next start`)
  runs on **:3100** (`home-finance-start` in `.claude/launch.json`). Run on 3000
  it pushed the dev server onto a random port, so the page open on 3000 was a
  production build that never hot-reloads, and it installed the service worker,
  which answers `/_next/static` from cache. `ServiceWorkerRegistrar` now removes
  any leftover worker and cache in development. Build only with no `next start`
  running — a build under a live server breaks it.
