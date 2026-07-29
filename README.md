# Silnik przeliczania cen skupu zbóż

Moduł do wyliczania ceny netto/t i wartości dostawy na podstawie cennika
skupującego (dopłaty/potrącenia za wilgotność, zanieczyszczenia, zaolejenie itd.).
Framework-agnostic — do podłączenia pod dowolny frontend (React/Vite + Firebase w kolejnym kroku).

## Struktura

```
src/
  types.ts                  – model danych (GrainPriceList, QualityParameter, Bracket...)
  pricingEngine.ts           – czysta funkcja calculatePrice() + logika liczenia
  data/
    rzepak-komagra.ts        – jedyny na razie wypełniony cennik (Komagra, rzepak)
  examples/
    example.ts               – przykład użycia + kontrola zgodności z ręcznym wyliczeniem
```

## Jak to działa

Każdy parametr jakości (`QualityParameter`) ma:
- `basePoint` — wartość referencyjną bez dopłaty/potrącenia,
- `step` — wielkość kroku (z dokumentu Komagry: 0,1%),
- `brackets` — listę przedziałów, każdy z typem (`premium` / `deduction` / `reject`) i stawką `ratePerStep`.

Dla podanej wartości silnik liczy różnicę względem `basePoint` w krokach
(zaokrąglając w górę do pełnego kroku — zasada "za każde rozpoczęte 0,1%"),
mnoży przez `ratePerStep` i cenę bazową, sumuje po wszystkich parametrach.
Jeśli wartość wpada w przedział `reject`, cała dostawa jest oznaczona jako
odrzucona (`rejected: true`) i cena końcowa = 0.

## Uruchomienie przykładu

```bash
npm install
npm run example
```

Powinno wypisać dwa scenariusze (zanieczyszczenia 4% i 6%, wilgotność 7%,
cena bazowa 2380 zł) i potwierdzić zgodność z ręcznym wyliczeniem
(2356,20 zł/t i 2213,40 zł/t).

## Dodawanie kolejnego zboża / skupującego

Nowy plik w `src/data/`, np. `pszenica-nazwa-skupu.ts`, eksportujący obiekt
`GrainPriceList` w tym samym kształcie co `rzepakKomagra`. Silnik (`pricingEngine.ts`)
nie wymaga żadnych zmian — cała różnica między zbożami to dane, nie kod.

## Komponenty UI

Przy budowaniu interfejsu korzystaj z gotowych komponentów z
[shadcn/ui](https://ui.shadcn.com) zamiast pisać własne od zera:

```bash
pnpm dlx shadcn@latest add <nazwa-komponentu>
```

Jeśli shadcn nie jest jeszcze zainicjowany w projekcie (brak pliku
`components.json`), najpierw `pnpm dlx shadcn@latest init --template vite` —
CLI wykryje Vite + React i skonfiguruje Tailwind, `cn()` util oraz zmienne CSS
automatycznie.

## Do zrobienia / do potwierdzenia (dla agenta kontynuującego pracę)

1. **Brakujące cenniki**: pszenica, żyto, pszenżyto, kukurydza — potrzebne
   analogiczne dokumenty od skupujących, żeby uzupełnić `src/data/`.
2. **Otwarte pytania w danych rzepaku** (patrz komentarze w
   `src/data/rzepak-komagra.ts`):
   - brak zdefiniowanego zachowania poniżej 6,00% wilgotności i poniżej 35,00% zaolejenia,
   - dopłata za zaolejenie >40% dotyczy tylko wariantu "z dopłatą za poziom zaolejenia" — do potwierdzenia, czy dotyczy tego konkretnego kontraktu.
3. **`rzepakKomagraHardRequirements`** (w tym samym pliku) — to progi
   "spełnia/nie spełnia" bez stopniowanych potrąceń (np. kwas erukowy, GMO).
   Na razie nie wchodzą do `calculatePrice()` — do rozważenia jako osobna
   walidacja/checklista w UI przed pokazaniem wyniku.
4. **Kolejny krok**: szkielet aplikacji (React + Vite + TypeScript + Firebase
   Firestore/Hosting) korzystający z tego modułu — osobna dostawa.

## Tipy dla agenta pracującego w tym projekcie

- **Cała logika cenowa to dane, nie kod.** Nowy cennik = nowy plik w
  `src/data/`, nigdy nowa gałąź `if`/`switch` w `pricingEngine.ts`.
- **Zaokrąglanie zawsze w górę.** "Za każde rozpoczęte 0,1%" = `Math.ceil`,
  nigdy `Math.round` ani `Math.floor` — to celowe, nie błąd do naprawienia.
- **Przed uznaniem zadania za zakończone** uruchom `pnpm run build` (albo
  `tsc -b` w samym module) — ma przechodzić bez błędów typów.
- **Menedżer pakietów: pnpm**, nie npm/yarn — nie generuj `package-lock.json`
  ani `yarn.lock`.
- **Nie commituj `.env` / `.env.local`** — tylko `.env.example`. Prawdziwe
  klucze Firebase trzymane są lokalnie.
- **`firestore.rules` jest celowo `deny-all`**, dopóki nie dojdzie Firebase
  Auth — nie odblokowuj bez wyraźnej instrukcji.
- **UI: shadcn/ui zamiast pisania od zera** — patrz sekcja "Komponenty UI"
  wyżej.
- Przy zmianach w silniku dopisz scenariusz testowy do `examples/example.ts`
  zamiast tylko ręcznie sprawdzać w konsoli — łatwiej złapać regresję przy
  kolejnej zmianie.
