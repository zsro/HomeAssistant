const TOKEN_KEY = 'token';
const DISPLAY_PAIR_TOKEN_KEY = 'display-pair-token';
const DISPLAY_TOKEN_KEY = 'display-token';
const DISPLAY_SESSION_ID_KEY = 'display-session-id';

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token) {
  if (!token) {
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

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

export {
  DISPLAY_PAIR_TOKEN_KEY,
  DISPLAY_SESSION_ID_KEY,
  DISPLAY_TOKEN_KEY,
  TOKEN_KEY,
};
