export function getErrorMessage(err) {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.request) return 'Cannot reach the server. Is it running?';
  return 'Something went wrong. Please try again.';
}