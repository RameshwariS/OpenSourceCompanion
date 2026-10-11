import { useQuery } from '@tanstack/react-query';
import { getRecommended } from '../api/issues';

export const useRecommended = (limit) =>
  useQuery({
    queryKey: ['recommended', limit],
    queryFn: () => getRecommended(limit),
    staleTime: 5 * 60_000,
    retry: false, // a rate limit won't fix itself in a second
  });