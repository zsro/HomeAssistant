const API_BASE_URL = import.meta.env.PROD
  ? '/api'
  : 'http://localhost:3001/api';

const DEFAULT_TIMEOUT = 300000;

async function parseResponseBody(response) {
  const rawText = await response.text();
  if (!rawText) {
    return null;
  }

  try {
    return JSON.parse(rawText);
  } catch {
    return { message: rawText };
  }
}

async function fetchWithTimeout(url, options = {}, timeout = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('请求超时，请稍后重试');
    }
    throw error;
  }
}

async function handleResponse(response) {
  const data = await parseResponseBody(response);

  if (!response.ok) {
    const requestError = new Error(
      data?.msg || data?.message || data?.error || `请求失败 (${response.status})`
    );
    requestError.code = data?.code ?? response.status;
    requestError.data = data;
    throw requestError;
  }

  if (data?.code !== undefined && data.code !== 0) {
    const error = new Error(data.msg || '请求失败');
    error.code = data.code;
    error.data = data;
    throw error;
  }

  if (data?.success === false || data?.error) {
    const error = new Error(data?.msg || data?.message || data?.error || '请求失败');
    error.code = data.code ?? -1;
    error.data = data;
    throw error;
  }

  if (!data) {
    return { success: true };
  }

  return data.success === undefined
    ? { ...data, success: true }
    : data;
}

async function getWithHeaders(url, headers, timeout = DEFAULT_TIMEOUT) {
  const response = await fetchWithTimeout(`${API_BASE_URL}${url}`, {
    headers,
  }, timeout);
  return handleResponse(response);
}

async function postWithHeaders(url, data, headers, timeout = DEFAULT_TIMEOUT) {
  const response = await fetchWithTimeout(`${API_BASE_URL}${url}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  }, timeout);
  return handleResponse(response);
}

function buildDisplayAuthHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export const displayApi = {
  async createSession(data = {}) {
    return postWithHeaders('/display/session', data, {
      'Content-Type': 'application/json',
    });
  },

  async getSession(token) {
    return getWithHeaders('/display/session', {
      Authorization: `Bearer ${token}`,
    });
  },

  async refreshSession(token) {
    return postWithHeaders('/display/session/refresh', {}, buildDisplayAuthHeaders(token));
  },

  async heartbeat(token) {
    return postWithHeaders('/display/session/heartbeat', {}, buildDisplayAuthHeaders(token));
  },

  async getState(token) {
    return getWithHeaders('/display/state', {
      Authorization: `Bearer ${token}`,
    });
  },
};
