import type { PriceCalculationResult } from '../types';

export interface SavedTrailer {
  tonnage: string;
  values: Record<string, string>;
  hasLabResults: boolean;
  hardReqValues: Record<string, string>;
}

export interface SavedTransport {
  id: string;
  name: string;
  date: string;
  description?: string;
  grain: string;
  buyer: string;
  basePrice: number;
  trailerCount: 1 | 2;
  trailers: SavedTrailer[];
  results?: PriceCalculationResult[];
  totalValue: number;
  createdAt: string;
}
