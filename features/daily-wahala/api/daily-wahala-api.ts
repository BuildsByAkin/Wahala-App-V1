// features/daily-wahala/api/daily-wahala-api.ts
// BACKEND.md §4 — single curated market per UTC day plus a tomorrow teaser.
// Returns 404 when no daily is scheduled; caller treats that as "none today".
import axios from 'axios';

import { api } from '@/lib/api/axios';
import type { Market } from '@/utils/market';

export type DailyWahalaTomorrowPreview = {
  question: string;
  category: string;
  scheduledFor: string;
};

export type DailyWahala = {
  market: Market;
  dailyWahalaAt: string;
  dailyWahalaUntil: string;
  tomorrowPreview: DailyWahalaTomorrowPreview | null;
};

export const dailyWahalaApi = {
  get: async (): Promise<DailyWahala | null> => {
    try {
      const { data } = await api.get<DailyWahala>('/daily-wahala');
      return data ?? null;
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) return null;
      throw e;
    }
  },
};
