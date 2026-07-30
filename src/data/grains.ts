export interface GrainInfo {
  key: string;
  label: string;
  plural: string;
}

export const GRAINS: GrainInfo[] = [
  { key: 'rzepak', label: 'Rzepak', plural: 'Rzepaku' },
  { key: 'pszenica', label: 'Pszenica', plural: 'Pszenicy' },
  { key: 'zyto', label: 'Żyto', plural: 'Żyta' },
  { key: 'pszenzyto', label: 'Pszenżyto', plural: 'Pszenżyta' },
  { key: 'kukurydza', label: 'Kukurydza', plural: 'Kukurydzy' },
];

export function getGrainLabel(key: string): string {
  return GRAINS.find((g) => g.key === key)?.label ?? key;
}
