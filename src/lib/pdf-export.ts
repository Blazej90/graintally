import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import type { SavedTransport, SavedTrailer } from '@/types/transport';
import type { ParameterResult, PriceCalculationResult } from '@/types';
import { getGrainLabel } from '@/data/grains';
import { getParameterLabel, formatParameterValue } from '@/data/parameter-labels';

type PdfMakeInstance = {
  vfs: Record<string, string>;
  createPdf: (doc: TDocumentDefinitions) => {
    download: (filename: string) => void;
  };
};

function fmt(n: number): string {
  return n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}.${month}.${year}`;
}

function margin(a: number, b: number, c: number, d: number): [number, number, number, number] {
  return [a, b, c, d];
}

function buildResultSection(
  result: PriceCalculationResult,
  heading: string,
  valueLabel: string
): Content[] {
  const resultRows: (string | number)[][] = [
    ['Tonaż', `${result.tonnage} t`],
    ['Cena końcowa / t', `${fmt(result.finalPricePerTonne)} zł/t`],
    [valueLabel, `${fmt(result.totalValue)} zł`],
  ];

  if (result.rejected) {
    resultRows.unshift([
      'Status',
      `ODRZUT${result.rejectReason ? ` – ${result.rejectReason}` : ''}`,
    ]);
  }

  const section: Content[] = [
    { text: heading, style: 'tableHeader' },
    {
      table: {
        widths: ['*', '*'],
        body: resultRows,
      },
      layout: 'lightHorizontalLines',
      margin: margin(0, 0, 0, 8),
    },
  ];

  if (result.parameterResults.length > 0) {
    section.push(
      { text: 'Rozliczenie parametrów', style: 'tableHeader' },
      {
        table: {
          widths: ['*', '*', '*'],
          body: [
            ['Parametr', 'Wartość', 'Wpływ / t'],
            ...result.parameterResults.map((pr: ParameterResult) => [
              pr.label,
              String(pr.value),
              `${pr.amountPerTonne >= 0 ? '+' : ''}${fmt(pr.amountPerTonne)} zł/t`,
            ]),
          ],
        },
        layout: 'lightHorizontalLines',
        margin: margin(0, 0, 0, 8),
      }
    );
  }

  return section;
}

function buildTrailerSection(
  transport: SavedTransport,
  trailer: SavedTrailer,
  index: number
): Content[] {
  // Osobny wynik per wpis tylko w starych zapisach (dane rozbite na przyczepy);
  // nowe dostawy mają zawsze jeden wpis z łącznym tonażem i jeden wynik.
  const result =
    transport.results && transport.results.length === transport.trailers.length
      ? transport.results[index]
      : undefined;
  const params = Object.entries(trailer.values).filter(([, value]) => value !== '');
  const labParams = trailer.hasLabResults
    ? Object.entries(trailer.hardReqValues).filter(([, value]) => value !== '')
    : [];

  const section: Content[] = [
    { text: 'Dane dostawy', style: 'subheader' },
    {
      table: {
        widths: ['*', '*'],
        body: [
          ['Tonaż', `${trailer.tonnage} t`],
          ['Cena bazowa', `${fmt(transport.basePrice)} zł/t`],
        ],
      },
      layout: 'lightHorizontalLines',
      margin: margin(0, 0, 0, 8),
    },
  ];

  if (params.length > 0) {
    section.push(
      { text: 'Parametry jakości', style: 'tableHeader' },
      {
        table: {
          widths: ['*', '*'],
          body: [
            ['Parametr', 'Wartość'],
            ...params.map(([key, value]) => [
              getParameterLabel(key),
              formatParameterValue(key, value),
            ]),
          ],
        },
        layout: 'lightHorizontalLines',
        margin: margin(0, 0, 0, 8),
      }
    );
  }

  if (labParams.length > 0) {
    section.push(
      { text: 'Badanie laboratoryjne', style: 'tableHeader' },
      {
        table: {
          widths: ['*', '*'],
          body: [
            ['Parametr', 'Wartość'],
            ...labParams.map(([key, value]) => [
              getParameterLabel(key),
              formatParameterValue(key, value),
            ]),
          ],
        },
        layout: 'lightHorizontalLines',
        margin: margin(0, 0, 0, 8),
      }
    );
  }

  if (result) {
    section.push(...buildResultSection(result, 'Wynik przeliczenia', 'Wartość dostawy'));
  }

  return section;
}

export async function downloadTransportPdf(transport: SavedTransport): Promise<void> {
  const pdfMakeModule = await import('pdfmake/build/pdfmake');
  const pdfFontsModule = await import('pdfmake/build/vfs_fonts');

  const pdfMake =
    ((pdfMakeModule as unknown as { default?: PdfMakeInstance }).default ??
      (pdfMakeModule as unknown as PdfMakeInstance));
  const pdfFonts =
    ((pdfFontsModule as unknown as { default?: Record<string, string> }).default ??
      (pdfFontsModule as unknown as Record<string, string>));

  pdfMake.vfs = pdfFonts;

  // Wariant przejściowy: zapis z wieloma wpisami, ale jednym wspólnym wynikiem.
  const setResult =
    transport.results && transport.results.length === 1 && transport.trailers.length > 1
      ? transport.results[0]
      : undefined;

  const docDefinition: TDocumentDefinitions = {
    content: [
      { text: transport.name, style: 'title' },
      {
        table: {
          widths: ['*', '*'],
          body: [
            ['Data', formatDate(transport.date)],
            ['Zboże', getGrainLabel(transport.grain)],
            ['Kupujący', transport.buyer],
            // Liczba przyczep tylko w starych zapisach zestawu — dziś dostawa
            // to jedna waga, więc pole nie ma znaczenia.
            ...(transport.trailerCount === 2 ? [['Liczba przyczep', '2 (zestaw)']] : []),
            ['Cena bazowa', `${fmt(transport.basePrice)} zł/t`],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: margin(0, 0, 0, 12),
      },
      ...(transport.description
        ? [
            { text: 'Opis', style: 'subheader' },
            { text: transport.description, margin: margin(0, 0, 0, 12) },
          ]
        : []),
      ...transport.trailers.flatMap((trailer, idx) =>
        buildTrailerSection(transport, trailer, idx)
      ),
      ...(setResult
        ? buildResultSection(setResult, 'Wynik przeliczenia — średnia zestawu', 'Wartość zestawu')
        : []),
      {
        table: {
          widths: ['*', '*'],
          body: [['Wartość całkowita transportu', `${fmt(transport.totalValue)} zł`]],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 8,
          paddingBottom: () => 8,
          fillColor: () => '#f3f4f6',
        },
        margin: margin(0, 12, 0, 0),
      },
    ],
    styles: {
      title: {
        fontSize: 18,
        bold: true,
        margin: margin(0, 0, 0, 12),
      },
      subheader: {
        fontSize: 14,
        bold: true,
        margin: margin(0, 10, 0, 6),
      },
      tableHeader: {
        fontSize: 11,
        bold: true,
        margin: margin(0, 6, 0, 4),
      },
    },
    defaultStyle: {
      fontSize: 10,
    },
  };

  const safeName = transport.name
    .replace(/[^\p{L}\p{N}\- _]/gu, '_')
    .replace(/\s+/g, '_');
  pdfMake.createPdf(docDefinition).download(`${safeName}.pdf`);
}
