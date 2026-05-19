// features/moderation/hooks/use-report.ts
import { useMutation } from '@tanstack/react-query';

import {
  reportsApi,
  type ReportPayload,
} from '@/features/moderation/api/reports-api';

export function useReport() {
  return useMutation({
    mutationFn: (payload: ReportPayload) => reportsApi.create(payload),
  });
}
