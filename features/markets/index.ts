// features/markets/index.ts
export { marketsApi } from './api/markets-api';
export type {
  DetailOutcome,
  MarketDetail,
  MarketDetailResponse,
  CampStaker,
} from './api/markets-api';

export { campRosterApi } from './api/camp-roster-api';
export type { RosterMember, RosterResponse } from './api/camp-roster-api';

export { activityApi } from './api/activity-api';
export type {
  ActivityEvent,
  ActivityResponse,
  StakeEvent,
  StanceChangeEvent,
  MilestoneEvent,
  ResolutionEvent,
} from './api/activity-api';

export { useMarket } from './hooks/use-market';
export { useMarkets } from './hooks/use-markets';
export { useCampRoster } from './hooks/use-camp-roster';
export { useActivityFeed } from './hooks/use-activity-feed';
