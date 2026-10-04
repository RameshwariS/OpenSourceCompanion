// Error codes the backend puts in ?error=... after a failed GitHub redirect
export const OAUTH_ERRORS = {
  GITHUB_FAILED: 'GitHub sign-in failed. Please try again.',
  GITHUB_DENIED: 'You cancelled the GitHub authorization.',
  GITHUB_NOT_CONFIGURED: 'GitHub login is not set up on this server yet.',
  GITHUB_EMAIL_EXISTS:
    'An account with your GitHub email already exists. Log in with your password, then use "Connect GitHub" on the dashboard.',
  GITHUB_ALREADY_LINKED: 'That GitHub account is already linked to a different user.',
  ACCOUNT_SUSPENDED: 'This account has been suspended.',
};