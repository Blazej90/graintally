/**
 * Typy dla silnika przeliczania cen skupu zbóż.
 *
 * Model jest celowo generyczny: jeden zestaw typów obsługuje dowolne zboże
 * (rzepak, pszenica, żyto, pszenżyto, kukurydza) i dowolnego skupującego —
 * różnice między nimi to tylko dane (patrz src/data/), nie kod.
 */

export type AdjustmentType = 'premium' | 'deduction';

/**
 * Pojedynczy przedział w tabeli dopłat/potrąceń dla danego parametru jakości.
 * `from` / `to` w tych samych jednostkach co wartość parametru (najczęściej %).
 * `to: null` oznacza brak górnego ograniczenia w tym przedziale.
 */
export interface AdjustmentBracket {
  from: number;
  to: number | null;
  type: AdjustmentType;
  /** stawka w % ceny bazowej netto, naliczana za każdy pełny/rozpoczęty `step` odchylenia od `basePoint` */
  ratePerStep: number;
}

/** Przedział, w którym dostawa NIE jest przyjmowana (np. wilgotność powyżej 10%). */
export interface RejectBracket {
  from: number;
  to: number | null;
  reject: true;
}

export type Bracket = AdjustmentBracket | RejectBracket;

export interface QualityParameter {
  /** unikalny klucz, np. 'wilgotnosc', 'zanieczyszczenia', 'zaolejenie' */
  key: string;
  label: string;
  unit: string;
  /** wartość referencyjna, przy której cena = cena bazowa (brak dopłaty/potrącenia) */
  basePoint: number;
  /** wielkość kroku, za który nalicza się stawkę — z dokumentu Komagry: 0.1 (%) */
  step: number;
  brackets: Bracket[];
}

export interface GrainPriceList {
  grain: string;
  buyer: string;
  /** identyfikator/źródło cennika, dla śledzenia wersji (np. numer kontraktu i data) */
  reference?: string;
  parameters: QualityParameter[];
}

export interface ParameterInput {
  key: string;
  value: number;
}

export interface ParameterResult {
  key: string;
  label: string;
  value: number;
  type: 'base' | AdjustmentType | 'reject';
  steps: number;
  ratePerStep: number;
  /** kwota w zł/t, ze znakiem: dodatnia = dopłata, ujemna = potrącenie */
  amountPerTonne: number;
}

export interface PriceCalculationResult {
  grain: string;
  buyer: string;
  basePrice: number;
  tonnage: number;
  rejected: boolean;
  rejectReason?: string;
  parameterResults: ParameterResult[];
  finalPricePerTonne: number;
  totalValue: number;
}
