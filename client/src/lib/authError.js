// Maps an axios error from an auth request into a message safe to show inline. Login and
// register share this: no business logic in components (CLAUDE.md §3).
export function getAuthErrorMessage(error, { fallback } = {}) {
  if (!error?.response) {
    return "Can't reach the server right now. Check your connection and try again.";
  }

  const { status, data } = error.response;

  if (status === 401) return "That email or password doesn't look right.";
  if (status === 409) return data?.message || 'An account with that email already exists — try logging in instead.';
  if (status === 400) return 'Please check the highlighted fields and try again.';

  return fallback || 'Something went wrong on our end. Please try again in a moment.';
}
