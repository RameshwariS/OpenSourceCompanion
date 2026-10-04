import { createContext, useContext } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();

  // The logged-in user is just server state, so React Query owns it.
  // On page load, this asks the server "who am I?" using the httpOnly cookie.
  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.getMe,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const setUser = (u) => queryClient.setQueryData(['me'], u);

  const loginMutation = useMutation({ mutationFn: authApi.login, onSuccess: setUser });
  const registerMutation = useMutation({ mutationFn: authApi.register, onSuccess: setUser });
  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      queryClient.clear(); // drop ALL cached data so the next user never sees it
      setUser(null);
    },
  });

  const value = {
    user: user ?? null,
    isLoading,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}