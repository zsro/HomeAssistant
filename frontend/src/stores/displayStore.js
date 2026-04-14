import { create } from 'zustand';
import { displayApi } from '../api/config';
import {
  clearDisplaySessionStorage,
  getDisplayPairToken,
  getDisplaySessionId,
  getDisplayToken,
  setDisplayPairToken,
  setDisplaySessionId,
  setDisplayToken,
} from '../utils/authToken';

function applySessionData(set, data) {
  if (data.sessionId) {
    setDisplaySessionId(data.sessionId);
  }

  if (data.pairToken) {
    setDisplayPairToken(data.pairToken);
  }

  if (data.displayToken) {
    setDisplayToken(data.displayToken);
  }

  set((state) => ({
    ...state,
    sessionId: data.sessionId || state.sessionId,
    pairToken: data.pairToken || state.pairToken,
    displayToken: data.displayToken || state.displayToken,
    pairCode: data.pairCode ?? state.pairCode,
    expiresAt: data.expiresAt ?? state.expiresAt,
    isBound: data.isBound ?? state.isBound,
    device: data.device ?? state.device,
    currentState: data.state ?? state.currentState,
    error: null,
  }));
}

export const useDisplayStore = create((set, get) => ({
  sessionId: getDisplaySessionId(),
  pairToken: getDisplayPairToken(),
  displayToken: getDisplayToken(),
  pairCode: null,
  expiresAt: null,
  isBound: false,
  device: null,
  currentState: null,
  isLoading: false,
  error: null,
  socketConnected: false,

  initializeSession: async () => {
    set({ isLoading: true, error: null });

    const displayToken = get().displayToken;
    const pairToken = get().pairToken;

    try {
      if (displayToken) {
        const response = await displayApi.getSession(displayToken);
        applySessionData(set, response.data);
        set({ isLoading: false, isBound: true });
        return;
      }

      if (pairToken) {
        const response = await displayApi.getSession(pairToken);
        applySessionData(set, response.data);
        set({ isLoading: false });
        return;
      }

      const response = await displayApi.createSession();
      applySessionData(set, {
        ...response.data,
        isBound: false,
      });
      set({ isLoading: false });
    } catch (error) {
      clearDisplaySessionStorage();
      try {
        const response = await displayApi.createSession();
        applySessionData(set, {
          ...response.data,
          isBound: false,
        });
        set({ isLoading: false, error: null });
      } catch (fallbackError) {
        set({
          sessionId: null,
          pairToken: null,
          displayToken: null,
          pairCode: null,
          expiresAt: null,
          isBound: false,
          device: null,
          currentState: null,
          isLoading: false,
          error: fallbackError.message || error.message || '初始化展示端失败',
        });
      }
    }
  },

  pollSession: async () => {
    const token = get().displayToken || get().pairToken;
    if (!token) {
      return;
    }

    try {
      const response = await displayApi.getSession(token);
      applySessionData(set, response.data);
    } catch (error) {
      clearDisplaySessionStorage();
      set({
        sessionId: null,
        pairToken: null,
        displayToken: null,
        pairCode: null,
        expiresAt: null,
        isBound: false,
        device: null,
        currentState: null,
        error: error.message || '获取展示会话失败',
      });
    }
  },

  applySocketSession: (data) => {
    applySessionData(set, data);
  },

  applySocketState: (state) => {
    set({
      currentState: state,
      isBound: true,
      error: null,
    });
  },

  setSocketConnected: (connected) => {
    set({ socketConnected: connected });
  },

  refreshPairCode: async () => {
    const token = get().pairToken;
    if (!token) {
      return;
    }

    try {
      const response = await displayApi.refreshSession(token);
      applySessionData(set, response.data);
    } catch (error) {
      set({ error: error.message || '刷新配对码失败' });
    }
  },

  pollState: async () => {
    const token = get().displayToken;
    if (!token) {
      return;
    }

    try {
      const response = await displayApi.getState(token);
      set({ currentState: response.data, error: null, isBound: true });
    } catch (error) {
      set({ error: error.message || '获取展示内容失败' });
    }
  },

  sendHeartbeat: async () => {
    const token = get().displayToken;
    if (!token) {
      return;
    }

    try {
      await displayApi.heartbeat(token);
    } catch (error) {
      set({ error: error.message || '更新展示端心跳失败' });
    }
  },

  resetDisplay: () => {
    clearDisplaySessionStorage();
    set({
      sessionId: null,
      pairToken: null,
      displayToken: null,
      pairCode: null,
      expiresAt: null,
      isBound: false,
      device: null,
      currentState: null,
      isLoading: false,
      error: null,
      socketConnected: false,
    });
  },

  restartSession: async () => {
    get().resetDisplay();
    await get().initializeSession();
  },
}));
