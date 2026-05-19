// features/moderation/index.ts
export { reportsApi } from './api/reports-api';
export type {
  ReportPayload,
  ReportReason,
  ReportTargetType,
} from './api/reports-api';
export { useReport } from './hooks/use-report';
