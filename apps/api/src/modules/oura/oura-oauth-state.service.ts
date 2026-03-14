const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

const pendingStates = new Map<string, number>();

function purgeExpiredStates() {
  const now = Date.now();

  for (const [state, expiresAt] of pendingStates.entries()) {
    if (expiresAt <= now) {
      pendingStates.delete(state);
    }
  }
}

export function registerOuraOAuthState(state: string) {
  purgeExpiredStates();
  pendingStates.set(state, Date.now() + OAUTH_STATE_TTL_MS);
}

export function consumeOuraOAuthState(state: string) {
  purgeExpiredStates();

  const expiresAt = pendingStates.get(state);

  if (!expiresAt) {
    return false;
  }

  pendingStates.delete(state);

  return expiresAt > Date.now();
}
