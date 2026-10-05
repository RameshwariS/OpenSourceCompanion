import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as bookmarksApi from '../api/bookmarks';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils/getErrorMessage';
import { invalidateIssueData } from './invalidate';

export function useBookmarks(params) {
  return useQuery({ queryKey: ['bookmarks', params], queryFn: () => bookmarksApi.getBookmarks(params) });
}

export function useAddBookmark() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: bookmarksApi.addBookmark,
    onSuccess: () => {
      toast.success('Issue bookmarked');
      return invalidateIssueData(queryClient);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useRemoveBookmark() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: bookmarksApi.removeBookmark,
    onSuccess: () => {
      toast.success('Bookmark removed');
      return invalidateIssueData(queryClient);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}