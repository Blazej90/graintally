# GrainTally

🇵🇱 [Wersja polska](README.pl.md)

[![CI](https://github.com/Blazej90/graintally/actions/workflows/ci.yml/badge.svg)](https://github.com/Blazej90/graintally/actions/workflows/ci.yml)
![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![Vitest](https://img.shields.io/badge/unit%20tests-Vitest-6e9f18?logo=vitest&logoColor=white)
![Playwright](https://img.shields.io/badge/e2e-Playwright-2ead33?logo=playwright&logoColor=white)

A grain purchase price calculator for farmers. You enter the base price,
tonnage and the lab results of a delivery — the app computes the net price per
tonne after premiums and deductions, plus the total value of the transport,
according to the buyer's price list.

Instead of calculating moisture or contamination deductions by hand at the
weighbridge, you type in the lab parameters and immediately see what the
delivery is actually worth and where the difference against the base price
comes from.

> The UI is in Polish, as the app is built for Polish grain buying points.

## Engineering highlights

- **Data-driven pricing engine** — `calculatePrice()` in `src/pricingEngine.ts`
  is a pure function that knows nothing about grains or buyers. Every
  difference between price lists lives in data (`GrainPriceList`), so adding a
  new grain means adding a file, not a new `if` branch.
- **Real business rules, faithfully encoded** — bracketed premiums/deductions
  with "per started 0.1%" rounding (`Math.ceil`), delivery rejection zones and
  hard pass/fail requirements, all taken from an actual buyer's price sheet
  and verified against manual calculations in unit tests.
- **Testing at two levels** — Vitest for the pricing engine, Playwright for UI
  regression (including a subtle date-picker positioning bug that only a
  geometric assertion could catch).
- **Quality gate before every push** — `pnpm run verify` runs lint, type-check
  + build, unit tests and e2e tests; the same sequence runs in GitHub Actions
  on every push and PR to `main`.

## Features

- **Price calculator** — base price plus quality parameters yield the net
  price/t, broken down into individual premiums and deductions, and the total
  value of the delivery.
- **One delivery, one result** — a transport is weighed once and sampled once,
  so the calculator takes a single tonnage and a single set of lab parameters.
- **Delivery rejection** — if any parameter falls into a disqualifying
  bracket, the result is marked as rejected and the price is 0.
- **Saved transports** — contract name or number, date, description; a saved
  transport can be reopened and edited later.
- **Transport browser** — grouped by grain, with typo-tolerant fuzzy search by
  name, filtering by date (day, range, month, year) and buyer, and PDF export
  of a single transport.
- **Light and dark mode**, mobile-friendly layout.

## How the price is calculated

Each quality parameter (`QualityParameter`) is described by three things:

- `basePoint` — the reference value at which there is neither premium nor
  deduction,
- `step` — the step size (in the Komagra price list: 0.1%),
- `brackets` — value ranges, each with a type (`premium`, `deduction`,
  `reject`) and a `ratePerStep`.

The engine computes the difference between the measured value and the
`basePoint`, converts it into whole steps **rounding up** (the "per started
0.1%" rule), multiplies by the bracket rate and the base price, then sums the
result across all parameters. A value inside a `reject` bracket marks the
whole delivery as rejected (`rejected: true`, final price 0).

The engine (`src/pricingEngine.ts`) is a pure function and knows neither grain
names nor buyers — the entire difference between price lists lives in data.

## Project status

| Area | Status |
|---|---|
| Pricing engine | done, covered by tests |
| Rapeseed price list (Komagra) | entered |
| Wheat, rye, triticale, corn price lists | missing — documents from buyers needed |
| Data storage | browser `localStorage` |
| Firebase / cross-device sync | configured, but not used by the code yet |
| Authentication | none — that's why `firestore.rules` denies all access |

Transports are currently stored only in the browser (key `klosek-transports`),
so they don't travel between devices and disappear when site data is cleared.
Moving to Firestore requires Firebase Auth first — opening up the access rules
makes no sense without login.

## Getting started

Requirements: Node 22+ and pnpm.

```bash
pnpm install
pnpm run dev
```

The app starts at the address printed by Vite (`http://localhost:5173` by
default). Firebase is not needed for this.

### Scripts

| Command | Description |
|---|---|
| `pnpm run dev` | dev server |
| `pnpm run build` | `tsc -b && vite build` |
| `pnpm run preview` | preview of the built app |
| `pnpm run lint` | ESLint |
| `pnpm run test` | pricing engine unit tests (Vitest) |
| `pnpm run test:e2e` | browser UI tests (Playwright) |
| `pnpm run verify` | lint + build + both test suites |
| `pnpm run example` | prints example engine calculations to the console |

`pnpm run example` shows two scenarios (contamination 4% and 6%, moisture 7%,
base price 2380 PLN) and confirms they match a manual calculation: 2356.20
PLN/t and 2213.40 PLN/t.

The same sequence as in `verify` runs in CI on every push and pull request to
`main` — `.github/workflows/ci.yml`.

### Firebase configuration

Only needed for the future data sync:

1. Create a project in the
   [Firebase Console](https://console.firebase.google.com/) (the Spark plan is
   enough).
2. Add a web app and copy the SDK configuration.
3. `cp .env.example .env.local` and fill it in with the values from the
   console. `.env*` files are not committed to the repository.

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · shadcn/ui (Radix) ·
React Router · Vitest · Playwright · Firebase (prepared)

## Structure

```
src/
  pricingEngine.ts           – engine: pure calculatePrice() function
  pricingEngine.test.ts      – engine tests
  types.ts                   – engine model (GrainPriceList, QualityParameter, Bracket)
  types/transport.ts         – saved transport model (separate from the engine model)
  data/
    rzepak-komagra.ts        – rapeseed price list (Komagra)
    grains.ts                – grain list for the UI
    parameter-labels.ts      – Polish labels of quality parameters
  pages/                     – calculator, grain list, transport list
  components/                – layout, dialogs, forms + ui/ (shadcn)
  lib/                       – localStorage persistence, fuzzy search, PDF export, cn()
  examples/example.ts        – example calculations to print in the console
tests/                       – Playwright tests (calendar, edit mode, calculator, PDF)
firebase.ts                  – Firebase configuration
firestore.rules              – access rules (deny-all for now)
```

Watch out for two similarly named files: `src/types.ts` is the pricing engine
model, while `src/types/transport.ts` is the transport data model in the UI.

## Adding another grain or buyer

A new price list is a new file in `src/data/`, e.g. `pszenica-buyer-name.ts`,
exporting a `GrainPriceList` object in the same shape as `rzepakKomagra`. The
engine needs no changes at all — the difference between grains and buyers is
data, not code.

## Roadmap

1. Fill in the missing price lists (wheat, rye, triticale, corn).
2. Firebase Auth, then storing transports in Firestore and opening up
   `firestore.rules`.
3. Validation of hard requirements ("pass / fail", e.g. erucic acid, GMO) —
   `rzepakKomagraHardRequirements` are already in the data, but don't feed
   into `calculatePrice()`.
4. Offline mode (PWA) and history export to CSV (single-transport PDF export
   is already in place).

### Open questions in the rapeseed price list

Details in the comments in `src/data/rzepak-komagra.ts`:

- no defined behavior below 6.00% moisture and below 35.00% oil content,
- the premium for oil content above 40% applies to the "with oil-content
  premium" variant — to be confirmed whether it covers this specific contract.

## Working conventions

The rules that apply when making changes — step rounding, adding price lists,
the required verification before pushing, working with shadcn/ui — are
described in [`AGENTS.md`](AGENTS.md). `CLAUDE.md` only imports it.
