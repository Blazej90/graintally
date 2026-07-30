<!-- rtk-instructions v2 -->
# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:
```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)
```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (60-99% savings)
```bash
rtk cargo test          # Cargo test failures only (90%)
rtk go test             # Go test failures only (90%)
rtk jest                # Jest failures only (99.5%)
rtk vitest              # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk pytest              # Python test failures only (90%)
rtk rake test           # Ruby test failures only (90%)
rtk rspec               # RSpec test failures only (60%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)
```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)
```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)
```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)
```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%). Format flags (-c, -l, -L, -o, -Z) run raw.
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)
```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)
```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)
```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands
```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category | Commands | Typical Savings |
|----------|----------|-----------------|
| Tests | vitest, playwright, cargo test | 90-99% |
| Build | next, tsc, lint, prettier | 70-87% |
| Git | status, log, diff, add, commit | 59-80% |
| GitHub | gh pr, gh run, gh issue | 26-87% |
| Package Managers | pnpm, npm, npx | 70-90% |
| Files | ls, read, grep, find | 60-75% |
| Infrastructure | docker, kubectl | 85% |
| Network | curl, wget | 65-70% |

Overall average: **60-90% token reduction** on common development operations.
<!-- /rtk-instructions -->

# GrainTally — konwencje projektu

Silnik przeliczania cen skupu zbóż (netto/t + wartość dostawy) na podstawie
cenników skupujących, z frontendem React + Vite + Firebase.

## Zasady, których nie łam

- **Logika cenowa to dane, nie kod.** Nowy cennik = nowy plik w `src/data/`
  eksportujący `GrainPriceList` w kształcie `rzepakKomagra`. Nigdy nowa gałąź
  `if`/`switch` w `src/pricingEngine.ts` — silnik nie zna nazw zbóż.
- **Liczba kroków zawsze w górę.** `Math.ceil(diffH / stepH)`
  (`pricingEngine.ts:63`) realizuje zasadę „za każde rozpoczęte 0,1%" — to
  celowe, nie błąd do naprawienia. Uwaga na rozróżnienie: pozostałe `Math.round`
  w tym pliku zaokrąglają **kwoty do groszy** (`*100 / 100`) i z tą zasadą nie
  mają nic wspólnego.
- **Menedżer pakietów: pnpm.** Nie generuj `package-lock.json` ani `yarn.lock`.
  W repo jest `pnpm-workspace.yaml`.
- **`firestore.rules` jest celowo deny-all** do czasu dodania Firebase Auth
  (faza 3 roadmapy). Nie odblokowuj bez wyraźnej instrukcji.
- **Nie commituj `.env` / `.env.local`** — tylko `.env.example`. Klucze Firebase
  trzymane lokalnie.
- **UI: shadcn/ui zamiast pisania komponentów od zera.** shadcn jest już
  zainicjowany (`components.json`), komponenty lądują w `src/components/ui/`:
  `pnpm dlx shadcn@latest add <nazwa>`
- **Nie dopisuj `forwardRef` do komponentów shadcn.** Projekt stoi na React 19,
  gdzie `ref` jest zwykłym propsem — komponenty shadcn są poprawne takie, jakie
  generuje CLI. Kontekst niżej.

## Dlaczego React musi zostać na 19

Komponenty shadcn są pisane pod React 19: zwykłe funkcje, bez `forwardRef`.
Na React 18 taki komponent **cicho gubi ref** — build przechodzi, komponent się
renderuje, w konsoli leci tylko ostrzeżenie „Function components cannot be given
refs". Objawy nie wyglądają na problem z refami:

- `Button` bez `forwardRef` → Radix `Slot` nie przekazuje refa przy `asChild` →
  Popover nie ma elementu kotwiczącego → Floating UI nigdy nie liczy pozycji
  i popover zostaje na `transform: translate(0, -200%)`, czyli ~586 px nad
  ekranem. Objaw: „kalendarz się nie otwiera", mimo że jest w DOM, kompletny
  i widoczny dla `toBeVisible()`.
- `*Overlay` bez `forwardRef` → Radix `<Presence>` nie mierzy animacji zamykania.

Projekt przeszedł przez ten błąd (React 18 + łatki `forwardRef`) i wyszedł z
niego przez upgrade do React 19. **Cofnięcie Reacta do 18 przywróci go w całości**
— `tests/calendar.spec.ts` wtedy oblewa wszystkimi ośmioma testami, z czego test
kalendarza komunikatem „popover ucieka nad górną krawędź, Received: -586.375".

## Weryfikacja zmian

```bash
rtk pnpm run build      # tsc -b && vite build — bez błędów typów
rtk pnpm run test       # vitest run — silnik cenowy
rtk pnpm run test:e2e   # playwright test — regresja UI (sam wstaje serwer dev)
rtk pnpm run example    # tsx src/examples/example.ts — wypisuje scenariusze
```

- **`src/pricingEngine.test.ts`** — scenariusze silnika sprawdzane względem
  ręcznego wyliczenia z dokumentu Komagry. Przy zmianie w silniku dopisz tu
  przypadek, nie tylko do `examples/example.ts` (ten służy do oglądania wyniku
  w konsoli, nie do łapania regresji).
- **`tests/calendar.spec.ts`** — regresja kalendarza. Sprawdza **pozycję**
  popovera, nie samą obecność w DOM: przy tamtym błędzie kalendarz był kompletny
  i „widoczny", tylko poza ekranem. Jeśli dotykasz `ui/date-picker.tsx`,
  `ui/calendar.tsx`, `ui/popover.tsx` albo wersji Reacta — uruchom te testy.

ESLinta w projekcie nie ma.

## Orientacja w kodzie

```
src/
  pricingEngine.ts        – czysta funkcja calculatePrice(), bez wiedzy o zbożach
  pricingEngine.test.ts   – testy silnika (vitest)
  types.ts                – model silnika (GrainPriceList, QualityParameter, Bracket)
  data/
    rzepak-komagra.ts     – jedyny wypełniony cennik + rzepakKomagraHardRequirements
    grains.ts             – lista zbóż dla UI
    parameter-labels.ts   – polskie etykiety parametrów jakości
  types/transport.ts      – model zapisanych transportów (osobny od modelu silnika)
  pages/                  – calculator-page, transports-page, transports-index-page
  components/             – layout, dialogi, formularze + ui/ (shadcn)
  lib/                    – storage, fuzzy-search, utils (cn)
  examples/example.ts     – scenariusze silnika do oglądania w konsoli
tests/calendar.spec.ts    – regresja kalendarza (playwright)
firebase.ts               – konfiguracja Firebase (root, nie src/)
```

Uwaga na dwa różne „types": `src/types.ts` to model silnika cenowego,
`src/types/transport.ts` to model danych transportu w UI.

## Stan / otwarte tematy

- Brakujące cenniki: pszenica, żyto, pszenżyto, kukurydza — potrzebne dokumenty
  od skupujących.
- Niedookreślone progi w rzepaku Komagra: brak zdefiniowanego zachowania poniżej
  6,00% wilgotności i poniżej 35,00% zaolejenia (patrz komentarze w pliku).
- `rzepakKomagraHardRequirements` (progi spełnia/nie spełnia — kwas erukowy, GMO)
  **nie wchodzą** do `calculatePrice()`. Do rozważenia jako osobna walidacja w UI.
- README.md opisuje projekt jako sam moduł silnika — ta część jest nieaktualna,
  UI jest już zbudowane.
