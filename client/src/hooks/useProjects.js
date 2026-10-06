import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as projectsApi from '../api/projects';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils/getErrorMessage';

const invalidateProjects = (queryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: ['projects'] }),
    queryClient.invalidateQueries({ queryKey: ['project'] }),
  ]);

export function useProjects(params) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: () => projectsApi.getProjects(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useProject(id) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.getProject(id),
    retry: false, // a 404 won't fix itself
  });
}

export function useFollowProject() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: projectsApi.followProject,
    onSuccess: () => {
      toast.success('Following project');
      return invalidateProjects(queryClient);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUnfollowProject() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: projectsApi.unfollowProject,
    onSuccess: () => {
      toast.success('Unfollowed project');
      return invalidateProjects(queryClient);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

// No error toast here: the "add project" form shows the server's message inline.
export function useRegisterProject() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: projectsApi.registerProject,
    onSuccess: () => {
      toast.success('Project listed');
      return invalidateProjects(queryClient);
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: projectsApi.updateProject,
    onSuccess: () => {
      toast.success('Project updated');
      return invalidateProjects(queryClient);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: projectsApi.deleteProject,
    onSuccess: (_data, id) => {
      toast.success('Project removed');
      queryClient.removeQueries({ queryKey: ['project', id] });
      return queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}