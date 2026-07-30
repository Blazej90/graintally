# GrainTally — kalkulator cen skupu zbóż

Aplikacja licząca cenę netto/t i wartość dostawy na podstawie cennika
skupującego (dopłaty/potrącenia za wilgotność, zanieczyszczenia, zaolejenie itd.),
z zapisem transportów i ich przeglądem.

Sercem projektu jest framework-agnostyczny silnik (`src/pricingEngine.ts`),
niezależny od UI. Wokół niego stoi frontend React + Vite + Tailwind (shadcn/ui),
z Firebase przewidzianym na warstwę danych.

## Struktura

```
src/
  pricingEngine.ts          – czysta funkcja calculatePrice(), bez wiedzy o zbożach
  types.ts                  – model silnika (GrainPriceList, QualityParameter, Bracket...)
  data/
    rzepak-komagra.ts       – jedyny na razie wypełniony cennik (Komagra, rzepak)
    grains.ts               – lista zbóż dla UI
    parameter-labels.ts     – polskie etykiety parametrów jakości
  types/transport.ts        – model zapisanego transportu (osobny od modelu silnika)
  pages/                    – kalkulator, lista i szczegóły transportów
  components/               – layout, dialogi, formularze + ui/ (shadcn)
  lib/                      – storage, fuzzy-search, cn()
  examples/
    example.ts              – przykład użycia + kontrola zgodności z ręcznym wyliczeniem
firebase.ts                 – konfiguracja Firebase
firestore.rules             – celowo deny-all, dopóki nie dojdzie Firebase Auth
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

## Uruchomienie

```bash
pnpm install
pnpm run dev        # aplikacja (Vite)
pnpm run build      # tsc -b && vite build
pnpm run example    # scenariusze kontrolne silnika
```

### Przykład silnika

Powinno wypisać dwa scenariusze (zanieczyszczenia 4% i 6%, wilgotność 7%,
cena bazowa 2380 zł) i potwierdzić zgodność z ręcznym wyliczeniem
(2356,20 zł/t i 2213,40 zł/t).

## Dodawanie kolejnego zboża / skupującego

Nowy plik w `src/data/`, np. `pszenica-nazwa-skupu.ts`, eksportujący obiekt
`GrainPriceList` w tym samym kształcie co `rzepakKomagra`. Silnik (`pricingEngine.ts`)
nie wymaga żadnych zmian — cała różnica między zbożami to dane, nie kod.

## Do zrobienia / do potwierdzenia

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
4. **Firebase Auth** — dopóki go nie ma, `firestore.rules` blokuje wszystko
   (faza 3 roadmapy).

## Konwencje pracy

Zasady obowiązujące przy zmianach w kodzie (zaokrąglanie, dodawanie cenników,
weryfikacja, shadcn/ui) opisuje [`CLAUDE.md`](CLAUDE.md).
