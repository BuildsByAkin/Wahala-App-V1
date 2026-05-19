// features/moderation/api/reports-api.ts
// BACKEND.md §16 — user-initiated moderation reports. Throttled to
// 20/day/user server-side (we mirror the limit client-side as a soft guard).
import { api } from '@/lib/api/axios';

export type ReportTargetType = 'comment' | 'chat' | 'user';

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate'
  | 'misinfo'
  | 'illegal'
  | 'other';

export type ReportPayload = {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
};

export const reportsApi = {
  create: async (payload: ReportPayload): Promise<void> => {
    await api.post('/reports', payload);
  },
};
