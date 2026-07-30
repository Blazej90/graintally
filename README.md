# GrainTally

Kalkulator cen skupu zbóż dla rolnika. Podajesz cenę bazową, tonaż i wyniki
badania laboratoryjnego dostawy — aplikacja liczy cenę netto za tonę po
dopłatach i potrąceniach oraz łączną wartość transportu, zgodnie z cennikiem
skupującego.

Zamiast liczyć potrącenia za wilgotność czy zanieczyszczenia ręcznie przy wadze,
wpisujesz parametry z badania i od razu widzisz, ile faktycznie wychodzi za
dostawę i skąd wzięła się różnica względem ceny bazowej.

## Co potrafi

- **Kalkulator ceny** — cena bazowa plus parametry jakości dają cenę netto/t,
  rozbicie na poszczególne dopłaty i potrącenia oraz wartość całej dostawy.
- **Dwie przyczepy w jednym transporcie** — osobne tonaże i osobne wyniki badań,
  wspólne podsumowanie wartości.
- **Odrzucenie dostawy** — jeśli któryś parametr wpada w przedział
  dyskwalifikujący, wynik jest oznaczony jako odrzucony, a cena wynosi 0.
- **Zapis transportów** — nazwa lub numer kontraktu, data, opis; zapisany
  transport można później otworzyć i poprawić.
- **Przegląd transportów** — pogrupowane po zbożu, z wyszukiwaniem po nazwie
  (odpornym na literówki) oraz filtrowaniem po dacie (dzień, zakres, miesiąc,
  rok) i skupującym.
- **Tryb jasny i ciemny**, układ przystosowany do telefonu.

## Jak liczona jest cena

Każdy parametr jakości (`QualityParameter`) opisują trzy rzeczy:

- `basePoint` — wartość referencyjna, przy której nie ma dopłaty ani potrącenia,
- `step` — wielkość kroku (w cenniku Komagry: 0,1%),
- `brackets` — przedziały wartości, każdy z typem (`premium`, `deduction`,
  `reject`) i stawką `ratePerStep`.

Silnik liczy różnicę między wartością zmierzoną a `basePoint`, przelicza ją na
pełne kroki **zaokrąglając w górę** (zasada „za każde rozpoczęte 0,1%"), mnoży
przez stawkę przedziału i cenę bazową, po czym sumuje wynik po wszystkich
parametrach. Wartość w przedziale `reject` oznacza całą dostawę jako odrzuconą
(`rejected: true`, cena końcowa 0).

Silnik (`src/pricingEngine.ts`) jest czystą funkcją i nie zna nazw zbóż ani
skupujących — cała różnica między cennikami siedzi w danych.

## Stan projektu

| Obszar | Stan |
|---|---|
| Silnik przeliczania cen | gotowy, pokryty testami |
| Cennik rzepaku (Komagra) | wprowadzony |
| Cenniki pszenicy, żyta, pszenżyta, kukurydzy | brak — potrzebne dokumenty od skupujących |
| Zapis danych | `localStorage` przeglądarki |
| Firebase / synchronizacja między urządzeniami | konfiguracja jest, kod jej jeszcze nie używa |
| Logowanie | brak — dlatego `firestore.rules` blokuje cały dostęp |

Transporty trzymane są na razie wyłącznie w przeglądarce (klucz
`klosek-transports`), więc nie przechodzą między urządzeniami i znikają razem
z wyczyszczeniem danych witryny. Przejście na Firestore wymaga najpierw Firebase
Auth — bez logowania nie ma sensu otwierać reguł dostępu.

## Uruchomienie

Wymagane: Node 22+ i pnpm.

```bash
pnpm install
pnpm run dev
```

Aplikacja wstanie pod adresem wypisanym przez Vite (domyślnie
`http://localhost:5173`). Firebase nie jest do tego potrzebny.

### Skrypty

| Polecenie | Opis |
|---|---|
| `pnpm run dev` | serwer deweloperski |
| `pnpm run build` | `tsc -b && vite build` |
| `pnpm run preview` | podgląd zbudowanej wersji |
| `pnpm run lint` | ESLint |
| `pnpm run test` | testy jednostkowe silnika (Vitest) |
| `pnpm run test:e2e` | testy UI w przeglądarce (Playwright) |
| `pnpm run verify` | lint + build + oba zestawy testów |
| `pnpm run example` | wypisuje w konsoli przykładowe wyliczenia silnika |

`pnpm run example` pokazuje dwa scenariusze (zanieczyszczenia 4% i 6%,
wilgotność 7%, cena bazowa 2380 zł) i potwierdza zgodność z ręcznym wyliczeniem:
2356,20 zł/t oraz 2213,40 zł/t.

Ta sama sekwencja co w `verify` chodzi w CI przy każdym pushu i pull requeście
do `main` — `.github/workflows/ci.yml`.

### Konfiguracja Firebase

Potrzebna dopiero pod przyszłą synchronizację danych:

1. Załóż projekt w [Firebase Console](https://console.firebase.google.com/)
   (plan Spark wystarczy).
2. Dodaj aplikację webową i skopiuj konfigurację SDK.
3. `cp .env.example .env.local` i uzupełnij wartościami z konsoli. Plików
   `.env*` nie commituje się do repozytorium.

## Technologie

React 19 · TypeScript · Vite · Tailwind CSS 4 · shadcn/ui (Radix) ·
React Router · Vitest · Playwright · Firebase (przygotowany)

## Struktura

```
src/
  pricingEngine.ts           – silnik: czysta funkcja calculatePrice()
  pricingEngine.test.ts      – testy silnika
  types.ts                   – model silnika (GrainPriceList, QualityParameter, Bracket)
  types/transport.ts         – model zapisanego transportu (osobny od modelu silnika)
  data/
    rzepak-komagra.ts        – cennik rzepaku (Komagra)
    grains.ts                – lista zbóż dla UI
    parameter-labels.ts      – polskie etykiety parametrów jakości
  pages/                     – kalkulator, lista zbóż, lista transportów
  components/                – layout, dialogi, formularze + ui/ (shadcn)
  lib/                       – zapis w localStorage, wyszukiwanie rozmyte, cn()
  examples/example.ts        – przykładowe wyliczenia do wypisania w konsoli
tests/                       – testy Playwright (kalendarz, tryb edycji)
firebase.ts                  – konfiguracja Firebase
firestore.rules              – reguły dostępu (na razie deny-all)
```

Uwaga na dwa pliki o podobnej nazwie: `src/types.ts` to model silnika cenowego,
a `src/types/transport.ts` to model danych transportu w UI.

## Dodanie kolejnego zboża lub skupującego

Nowy cennik to nowy plik w `src/data/`, np. `pszenica-nazwa-skupu.ts`,
eksportujący obiekt `GrainPriceList` w tym samym kształcie co `rzepakKomagra`.
Silnik nie wymaga wtedy żadnych zmian — różnica między zbożami i skupującymi to
dane, nie kod.

## Plany

1. Uzupełnienie brakujących cenników (pszenica, żyto, pszenżyto, kukurydza).
2. Firebase Auth, a po nim zapis transportów w Firestore i otwarcie
   `firestore.rules`.
3. Walidacja wymagań progowych („spełnia / nie spełnia", np. kwas erukowy, GMO)
   — `rzepakKomagraHardRequirements` są już w danych, ale nie wchodzą do
   `calculatePrice()`.
4. Tryb offline (PWA) i eksport historii do CSV/PDF.

### Otwarte pytania w cenniku rzepaku

Szczegóły w komentarzach w `src/data/rzepak-komagra.ts`:

- brak zdefiniowanego zachowania poniżej 6,00% wilgotności i poniżej 35,00%
  zaolejenia,
- dopłata za zaolejenie powyżej 40% dotyczy wariantu „z dopłatą za poziom
  zaolejenia" — do potwierdzenia, czy obejmuje ten konkretny kontrakt.

## Konwencje pracy w kodzie

Zasady obowiązujące przy zmianach — zaokrąglanie kroków, dodawanie cenników,
wymagana weryfikacja przed pushem, praca z shadcn/ui — opisuje
[`CLAUDE.md`](CLAUDE.md).
