import type {
  GrainPriceList,
  ParameterInput,
  ParameterResult,
  PriceCalculationResult,
  Bracket,
  QualityParameter,
} from './types';

/**
 * Konwersja wartości procentowej na liczbę całkowitą w setnych częściach
 * procenta (np. 4.01% -> 401). Wszystkie porównania i różnice liczymy na
 * liczbach całkowitych, żeby uniknąć klasycznych błędów zmiennoprzecinkowych
 * (np. 4.01 - 2.00 w JS nie zawsze daje dokładnie 2.01).
 */
function toHundredths(value: number): number {
  return Math.round(value * 100);
}

function findBracket(param: QualityParameter, value: number): Bracket {
  const v = toHundredths(value);
  const match = param.brackets.find((b) => {
    const from = toHundredths(b.from);
    const to = b.to === null ? Infinity : toHundredths(b.to);
    return v >= from && v <= to;
  });

  if (!match) {
    throw new Error(
      `Brak zdefiniowanego przedziału dla parametru "${param.key}" = ${value}${param.unit}. ` +
        `Wartość jest poza zakresem opisanym w cenniku — sprawdź dane wejściowe albo uzupełnij ` +
        `przedziały w src/data/ dla tego parametru.`
    );
  }
  return match;
}

function calculateParameter(
  param: QualityParameter,
  value: number,
  basePrice: number
): ParameterResult {
  const bracket = findBracket(param, value);

  if ('reject' in bracket) {
    return {
      key: param.key,
      label: param.label,
      value,
      type: 'reject',
      steps: 0,
      ratePerStep: 0,
      amountPerTonne: 0,
    };
  }

  const baseH = toHundredths(param.basePoint);
  const valueH = toHundredths(value);
  const stepH = toHundredths(param.step);
  const diffH = Math.abs(valueH - baseH);

  // "za każde rozpoczęte 0,1%" -> zaokrąglamy w górę do pełnego kroku
  const steps = diffH === 0 ? 0 : Math.ceil(diffH / stepH);
  const sign = bracket.type === 'premium' ? 1 : -1;
  const amountPerTonne = sign * steps * (bracket.ratePerStep / 100) * basePrice;

  return {
    key: param.key,
    label: param.label,
    value,
    type: steps === 0 ? 'base' : bracket.type,
    steps,
    ratePerStep: bracket.ratePerStep,
    amountPerTonne: Math.round(amountPerTonne * 100) / 100,
  };
}

/**
 * Liczy cenę netto/t oraz wartość całej dostawy dla danego zboża,
 * cennika skupującego, ceny bazowej i zmierzonych parametrów jakości.
 */
export function calculatePrice(
  priceList: GrainPriceList,
  basePrice: number,
  inputs: ParameterInput[],
  tonnage: number
): PriceCalculationResult {
  if (basePrice <= 0) throw new Error('Cena bazowa musi być większa od zera.');
  if (tonnage < 0) throw new Error('Tonaż nie może być ujemny.');

  const parameterResults: ParameterResult[] = [];
  let rejected = false;
  let rejectReason: string | undefined;

  for (const input of inputs) {
    const param = priceList.parameters.find((p) => p.key === input.key);
    if (!param) {
      throw new Error(
        `Nieznany parametr "${input.key}" dla zboża "${priceList.grain}" (${priceList.buyer}).`
      );
    }

    const result = calculateParameter(param, input.value, basePrice);
    parameterResults.push(result);

    if (result.type === 'reject') {
      rejected = true;
      rejectReason = `${param.label}: ${input.value}${param.unit} — poza dopuszczalnym zakresem, brak przyjęcia dostawy`;
    }
  }

  const totalAdjustment = parameterResults.reduce((sum, r) => sum + r.amountPerTonne, 0);
  const finalPricePerTonne = rejected ? 0 : Math.round((basePrice + totalAdjustment) * 100) / 100;
  const totalValue = rejected ? 0 : Math.round(finalPricePerTonne * tonnage * 100) / 100;

  return {
    grain: priceList.grain,
    buyer: priceList.buyer,
    basePrice,
    tonnage,
    rejected,
    rejectReason,
    parameterResults,
    finalPricePerTonne,
    totalValue,
  };
}
