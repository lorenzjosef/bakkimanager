import type { ContractsSummary } from '@bakki/domain';
import { useQuery } from '@tanstack/react-query';
import { fetchApiJson } from '@/lib/api';
import { CONTRACTS_SUMMARY_QUERY_KEY } from './query-keys';

export function useContractsSummaryData() {
  return useQuery({
    queryKey: CONTRACTS_SUMMARY_QUERY_KEY,
    queryFn: () => fetchApiJson<ContractsSummary>('/contracts/summary'),
    retry: false,
  });
}
