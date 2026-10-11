export async function refreshMyPullRequests(user) {
  await forget(cacheKey(requireGithubLogin(user)));
}