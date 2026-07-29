# Kalkulator skupu zbóż — szkielet aplikacji

React + TypeScript + Vite, gotowy pod Firebase (Firestore + Hosting).
Silnik przeliczania cen (`src/pricing-engine/`) jest już przetestowany i
odtwarza wyliczenia z cennika Komagry — patrz plik w tym folderze dla
szczegółów modelu danych.

**Status:** zbudowane i sprawdzone (`npm install`, `tsc -b`, `vite build`
przechodzą bez błędów). Firebase jest podłączony konfiguracyjnie, ale
zapis/odczyt z Firestore jeszcze nie jest wywoływany z UI — to następny krok.

## Uruchomienie lokalnie

```bash
npm install
npm run dev
```

Otworzy się formularz: wybór zboża, cena bazowa, tonaż, parametry jakości —
i przycisk licząc cenę końcową oraz wartość dostawy przez `pricing-engine`.

## Podłączenie Firebase

1. Załóż projekt w [Firebase Console](https://console.firebase.google.com/) (plan Spark — darmowy, bez karty płatniczej).
2. Dodaj aplikację webową w projekcie, skopiuj konfigurację SDK.
3. `cp .env.example .env.local` i uzupełnij wartościami z konsoli.
4. `npm install -g firebase-tools` (jeśli jeszcze nie masz), `firebase login`, `firebase use --add` (wybierz swój projekt).
5. `firebase deploy --only firestore:rules` żeby wgrać reguły z `firestore.rules` (na razie blokują wszystko — do odblokowania po dodaniu Auth).
6. `npm run build && firebase deploy --only hosting` żeby wystawić aplikację publicznie.

## Struktura

```
src/
  main.tsx              – punkt wejścia React
  App.tsx                – formularz + wynik (na razie tylko rzepak/Komagra)
  firebase.ts             – inicjalizacja Firebase (Firestore), config z .env
  pricing-engine/         – silnik obliczeniowy (skopiowany z osobnej dostawy)
firebase.json              – konfiguracja Hosting + Firestore rules
firestore.rules            – reguły dostępu (na razie deny-all, patrz TODO w pliku)
.env.example                – szablon zmiennych środowiskowych Firebase
```

## Następne kroki (dla agenta w VS Code)

Zgodnie z wcześniej ustaloną roadmapą:

1. **Więcej zbóż** — uzupełnić `src/pricing-engine/data/` o pszenicę, żyto,
   pszenżyto, kukurydzę (potrzebne cenniki od skupujących), dodać je do
   `AVAILABLE_PRICE_LISTS` w `App.tsx`.
2. **Zapis do Firestore** — po udanym obliczeniu ceny (`handleCalculate` w
   `App.tsx`) zapisywać transakcję do kolekcji `transactions` (data, zboże,
   parametry, cena, tonaż, total). Dopiero wtedy odblokować `firestore.rules`.
3. **Widok historii** — nowy widok/route z listą transakcji, filtrem po roku
   i rodzaju zboża, plus podsumowania (suma ton, średnia cena, przychód).
4. **PWA + eksport** — manifest + service worker do działania offline w
   terenie, eksport historii do CSV/PDF.
5. **UI** — obecny formularz jest celowo minimalny (bez stylowania) — do
   dopracowania wizualnie w tej fazie.
