import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as prApi from '../api/pullRequests';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils/getErrorMessage';

export function usePullRequests() {
  return useQuery({ queryKey: ['pull-requests'], queryFn: prApi.getPullRequests, retry: false, staleTime: 60_000 });
}

export function useRefreshPullRequests() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: prApi.refreshPullRequests,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pull-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
      ]);
      toast.success('Pull requests refreshed');
    },
    onError: (err) => toast.error(getErrorMessage(err)), // includes the 5-minute cooldown message
  });
}