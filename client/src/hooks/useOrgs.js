import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/orgs';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils/getErrorMessage';

export const useFollowedOrgs = () => useQuery({ queryKey: ['orgs'], queryFn: api.getFollowedOrgs });

// No error toast: the form shows the server's message inline.
export function useFollowOrg() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: api.followOrg,
    onSuccess: (follow) => {
      toast.success(`Following ${follow.org}`);
      return queryClient.invalidateQueries({ queryKey: ['orgs'] });
    },
  });
}

export function useUnfollowOrg() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: api.unfollowOrg,
    onSuccess: () => {
      toast.success('Unfollowed organization');
      return queryClient.invalidateQueries({ queryKey: ['orgs'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}