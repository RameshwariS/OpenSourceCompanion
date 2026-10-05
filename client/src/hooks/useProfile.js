import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as usersApi from '../api/users';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils/getErrorMessage';

export function useProfile(username) {
  return useQuery({
    queryKey: ['profile', username],
    queryFn: () => usersApi.getProfile(username),
    retry: false, // a 404 won't fix itself
    staleTime: 60_000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: usersApi.updateProfile,
    onSuccess: (user) => {
      queryClient.setQueryData(['me'], user); // the navbar and forms see the change immediately
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile saved');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}