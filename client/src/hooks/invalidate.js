// After any bookmark/tracking change, every view that shows that state must refetch.
// These hit OUR server (which caches GitHub), so it's cheap.
export function invalidateIssueData(queryClient) {
  return Promise.all(
    ['issues', 'issue', 'bookmarks', 'contributions', 'contribution-stats'].map((key) =>
      queryClient.invalidateQueries({ queryKey: [key] }),
    ),
  );
}