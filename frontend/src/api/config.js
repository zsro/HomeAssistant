// 根据环境配置 API 地址
// 开发环境使用 localhost，生产环境使用相对路径（同域）
const API_BASE_URL = import.meta.env.PROD 
  ? '/api'  // 生产环境：使用同域的 /api 路径（Nginx 会代理到后端）
  : 'http://localhost:3001/api';  // 开发环境：直接访问后端

// 默认超时 5 分钟（AI 生成可能需要较长时间）
const DEFAULT_TIMEOUT = 300000;

// 获取存储的token
function getToken() {
  return localStorage.getItem('token');
}

async function fetchWithTimeout(url, options = {}, timeout = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  // 添加认证头
  const token = getToken();
  const headers = {
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
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
  const data = await response.json();
  
  // 检查错误码规范：code !== 0 表示错误
  if (data.code !== undefined && data.code !== 0) {
    const error = new Error(data.msg || '请求失败');
    error.code = data.code;
    error.data = data;
    throw error;
  }
  
  // 兼容旧格式（没有 code 字段）
  if (data.error) {
    const error = new Error(data.error);
    error.code = -1;
    error.data = data;
    throw error;
  }
  
  return data;
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

// 星星预备班相关API
export const starPrepApi = {
  // 模板
  async getTemplates() {
    return api.get('/star-prep/templates');
  },
  
  async getTemplate(id) {
    return api.get(`/star-prep/templates/${id}`);
  },
  
  async createTemplate(data) {
    return api.post('/star-prep/templates', data);
  },
  
  async applyTemplate(id, data) {
    return api.post(`/star-prep/templates/${id}/apply`, data);
  },
  
  async generateTemplate(data, timeout = DEFAULT_TIMEOUT) {
    return api.post('/star-prep/templates/generate', data, timeout);
  },
  
  async generateWeekTemplate(data, timeout = DEFAULT_TIMEOUT) {
    return api.post('/star-prep/templates/generate-week', data, timeout);
  },
  
  // 打卡
  async getCheckins(params = {}) {
    const query = new URLSearchParams(params).toString();
    return api.get(`/star-prep/checkins${query ? '?' + query : ''}`);
  },
  
  async createCheckin(data) {
    return api.post('/star-prep/checkins', data);
  },
  
  async getTodayCheckin() {
    return api.get('/star-prep/checkins/today');
  },
  
  // 日历
  async getCalendar(params = {}) {
    const query = new URLSearchParams(params).toString();
    return api.get(`/star-prep/calendar${query ? '?' + query : ''}`);
  },
  
  async getToday() {
    return api.get('/star-prep/today');
  },
  
  // 统计
  async getStats() {
    return api.get('/star-prep/stats');
  },
};
