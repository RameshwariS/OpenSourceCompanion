import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import * as api from '../api/notifications';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils/getErrorMessage';

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications({ limit: 20 }),
    staleTime: 30_000,
    refetchInterval: 120_000, // a safety net if the socket is down
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: api.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification'] }),
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: api.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

/** Opens the socket while the user is logged in and pushes new notifications into the cache. */
export function useNotificationSocket() {
  const queryClient = useQueryClient();
  const toast = useToast();

  useEffect(() => {
    const socket = io({ withCredentials: true });

    socket.on('notification', (n) => {
      queryClient.setQueryData(['notifications'], (old) =>
        old ? { items: [n, ...old.items].slice(0, 20), unreadCount: old.unreadCount + 1 } : old,
      );
      toast.success(n.message);
    });
    // After a reconnect we may have missed events, so load the truth from the server
    socket.on('connect', () => queryClient.invalidateQueries({ queryKey: ['notifications'] }));

    return () => socket.disconnect();
  }, [queryClient, toast]);
}