// features/markets/hooks/use-camp-roster.ts
import { useQuery } from '@tanstack/react-query';

import { campRosterKeys } from '@/lib/api/query-keys';
import { campRosterApi } from '@/features/markets/api/camp-roster-api';

export function useCampRoster(
  slug: string | undefined,
  outcomeId: string | undefined,
  params: { sort?: 'stake' | 'joined' } = {}
) {
  return useQuery({
    queryKey: campRosterKeys.list(slug, outcomeId, params),
    queryFn: () => campRosterApi.list(slug as string, outcomeId as string, params),
    enabled: !!slug && !!outcomeId,
    staleTime: 30_000,
  });
}
