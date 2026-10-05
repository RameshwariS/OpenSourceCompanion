import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/contributions';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils/getErrorMessage';
import { invalidateIssueData } from './invalidate';

export const useContributions = () => useQuery({ queryKey: ['contributions'], queryFn: api.getContributions });
export const useContributionStats = () =>
  useQuery({ queryKey: ['contribution-stats'], queryFn: api.getContributionStats });

export function useTrackIssue() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: api.trackIssue,
    onSuccess: () => {
      toast.success('Issue added to your contributions');
      return invalidateIssueData(queryClient);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateContribution() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: api.updateContribution,
    // Optimistic update: the card moves instantly, and rolls back if the server says no
    onMutate: async ({ id, ...changes }) => {
      await queryClient.cancelQueries({ queryKey: ['contributions'] });
      const previous = queryClient.getQueryData(['contributions']);
      queryClient.setQueryData(['contributions'], (old) =>
        old?.map((c) => (c.id === id ? { ...c, ...changes } : c)),
      );
      return { previous };
    },
    onError: (err, vars, context) => {
      queryClient.setQueryData(['contributions'], context?.previous);
      toast.error(getErrorMessage(err));
    },
    onSettled: () => invalidateIssueData(queryClient),
  });
}

export function useRemoveContribution() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: api.removeContribution,
    onSuccess: () => {
      toast.success('Stopped tracking this issue');
      return invalidateIssueData(queryClient);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}