export interface ParameterInfo {
  label: string;
  unit: string;
}

export const PARAMETER_LABELS: Record<string, ParameterInfo> = {
  wilgotnosc: { label: 'Wilgotność', unit: '%' },
  zanieczyszczenia: { label: 'Zanieczyszczenia razem', unit: '%' },
  zaolejenie: { label: 'Zaolejenie', unit: '%' },
  kwas_erukowy: { label: 'Kwas erukowy', unit: '%' },
  glukozynolany: { label: 'Glukozynolany', unit: 'mikromol/g' },
  nasiona_porosniete: { label: 'Nasiona porośnięte', unit: '%' },
  nasiona_zweglone: { label: 'Nasiona o zwęglonym wnętrzu', unit: '%' },
  nasiona_splesniale: { label: 'Nasiona spleśniałe', unit: '%' },
  wkt: { label: 'WKT', unit: '%' },
  nasiona_przytuli: { label: 'Nasiona przytuli', unit: '%' },
  rozkruszki_martwe: { label: 'Rozkruszki martwe', unit: 'szt./kg' },
};

export function getParameterLabel(key: string): string {
  return PARAMETER_LABELS[key]?.label ?? key.replace(/_/g, ' ');
}

export function getParameterUnit(key: string): string {
  return PARAMETER_LABELS[key]?.unit ?? '';
}

export function formatParameterValue(key: string, value: string): string {
  const unit = getParameterUnit(key);
  if (!unit) return value;
  if (unit === '%') return `${value}${unit}`;
  return `${value} ${unit}`;
}
