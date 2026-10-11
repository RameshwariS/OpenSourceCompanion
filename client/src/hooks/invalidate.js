// After any bookmark/tracking change, every view that shows that state must refetch.
// These hit OUR server (which caches GitHub), so it's cheap.
const KEYS = ['issues', 'issue', 'bookmarks', 'contributions', 'contribution-stats', 'recommended', 'dashboard'];

export function invalidateIssueData(queryClient) {
  return Promise.all(KEYS.map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
}