import { getAuthToken } from '../utils/authToken';

// 根据环境配置 API 地址
// 开发环境使用 localhost，生产环境使用相对路径（同域）
const API_BASE_URL = import.meta.env.PROD 
  ? '/api'  // 生产环境：使用同域的 /api 路径（Nginx 会代理到后端）
  : 'http://localhost:3001/api';  // 开发环境：直接访问后端

// 默认超时 5 分钟（AI 生成可能需要较长时间）
const DEFAULT_TIMEOUT = 300000;

function buildHeaders(headers = {}) {
  if (headers.Authorization || headers.authorization) {
    return headers;
  }

  const token = getAuthToken();
  if (!token) {
    return headers;
  }

  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
}

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
      headers: buildHeaders(options.headers),
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

// 统一处理响应，检查错误码
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

  // 检查错误码规范：code !== 0 表示错误
  if (data?.code !== undefined && data.code !== 0) {
    const error = new Error(data.msg || '请求失败');
    error.code = data.code;
    error.data = data;
    throw error;
  }
  
  // 兼容旧格式（没有 code 字段）
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

export const api = {
  baseURL: API_BASE_URL,
  
  async get(url, timeout) {
    const response = await fetchWithTimeout(`${API_BASE_URL}${url}`, {}, timeout);
    return handleResponse(response);
  },
  
  async post(url, data, timeout) {
    const response = await fetchWithTimeout(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }, timeout);
    return handleResponse(response);
  },
  
  async put(url, data, timeout) {
    const response = await fetchWithTimeout(`${API_BASE_URL}${url}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }, timeout);
    return handleResponse(response);
  },
  
  async delete(url, timeout) {
    const response = await fetchWithTimeout(`${API_BASE_URL}${url}`, {
      method: 'DELETE',
    }, timeout);
    return handleResponse(response);
  },
};

// 认证相关API
export const authApi = {
  async register(data) {
    return api.post('/auth/register', data);
  },
  
  async login(data) {
    return api.post('/auth/login', data);
  },
  
  async getMe() {
    return api.get('/auth/me');
  },
  
  async changePassword(data) {
    return api.put('/auth/password', data);
  },
};

// 家庭相关API
export const familyApi = {
  async getFamily() {
    return api.get('/family');
  },
  
  async getMembers() {
    return api.get('/family/members');
  },
  
  async updateFamily(data) {
    return api.put('/family', data);
  },
  
  async joinFamily(data) {
    return api.post('/family/join', data);
  },
  
  async leaveFamily() {
    return api.post('/family/leave');
  },
  
  async createFamily(data) {
    return api.post('/family/create', data);
  },
};

function buildDisplayAuthHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
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

export const displayApi = {
  async createSession(data = {}) {
    return api.post('/display/session', data);
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

  async pair(data) {
    return api.post('/display/pair', data);
  },

  async getDevices() {
    return api.get('/display/devices');
  },

  async getDeviceState(deviceId) {
    return api.get(`/display/devices/${deviceId}/state`);
  },

  async updateDeviceState(deviceId, data) {
    return api.put(`/display/devices/${deviceId}/state`, data);
  },
};

export const pinyinApi = {
  async getOverview() {
    return api.get('/pinyin/overview');
  },

  async getSummary() {
    return api.get('/pinyin/summary');
  },

  async completeLesson(lessonId) {
    return api.post('/pinyin/progress/complete', { lessonId });
  },
};
