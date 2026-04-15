const DISPLAY_PAIR_TOKEN_KEY = 'display-pair-token';
const DISPLAY_TOKEN_KEY = 'display-token';
const DISPLAY_SESSION_ID_KEY = 'display-session-id';
const DISPLAY_INSTALLATION_ID_KEY = 'display-installation-id';

export function getDisplayPairToken() {
  return localStorage.getItem(DISPLAY_PAIR_TOKEN_KEY);
}

export function setDisplayPairToken(token) {
  if (!token) {
    return;
  }

  localStorage.setItem(DISPLAY_PAIR_TOKEN_KEY, token);
}

export function clearDisplayPairToken() {
  localStorage.removeItem(DISPLAY_PAIR_TOKEN_KEY);
}

export function getDisplayToken() {
  return localStorage.getItem(DISPLAY_TOKEN_KEY);
}

export function setDisplayToken(token) {
  if (!token) {
    return;
  }

  localStorage.setItem(DISPLAY_TOKEN_KEY, token);
}

export function clearDisplayToken() {
  localStorage.removeItem(DISPLAY_TOKEN_KEY);
}

export function getDisplaySessionId() {
  return localStorage.getItem(DISPLAY_SESSION_ID_KEY);
}

export function setDisplaySessionId(sessionId) {
  if (!sessionId) {
    return;
  }

  localStorage.setItem(DISPLAY_SESSION_ID_KEY, sessionId);
}

export function clearDisplaySessionId() {
  localStorage.removeItem(DISPLAY_SESSION_ID_KEY);
}

export function clearDisplaySessionStorage() {
  clearDisplayPairToken();
  clearDisplayToken();
  clearDisplaySessionId();
}

export function getDisplayInstallationId() {
  return localStorage.getItem(DISPLAY_INSTALLATION_ID_KEY);
}

export function setDisplayInstallationId(installationId) {
  if (!installationId) {
    return;
  }

  localStorage.setItem(DISPLAY_INSTALLATION_ID_KEY, installationId);
}

export function getOrCreateDisplayInstallationId() {
  const existingInstallationId = getDisplayInstallationId();
  if (existingInstallationId) {
    return existingInstallationId;
  }

  const installationId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `display-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

  setDisplayInstallationId(installationId);
  return installationId;
}
