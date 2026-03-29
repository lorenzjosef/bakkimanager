import type { DashboardSummary } from '@bakki/domain';
import { useQuery } from '@tanstack/react-query';
import { fetchApiJson } from '@/lib/api';
import { DASHBOARD_SUMMARY_QUERY_KEY } from '@/queries/query-keys';

export function useDashboardSummary() {
  return useQuery({
    queryKey: DASHBOARD_SUMMARY_QUERY_KEY,
    queryFn: () => fetchApiJson<DashboardSummary>('/dashboard/summary'),
    retry: false,
  });
}
