import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getIssue, searchIssues } from '../api/issues';

export function useIssues(params) {
  return useQuery({
    queryKey: ['issues', params],
    queryFn: () => searchIssues(params),
    placeholderData: keepPreviousData, // keep showing the old page while the next loads
    staleTime: 60_000,
  });
}

export function useIssue(owner, repo, number) {
  return useQuery({
    queryKey: ['issue', owner, repo, number],
    queryFn: () => getIssue({ owner, repo, number }),
  });
}