const API_BASE_URL = 'http://localhost:3001/api';

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

export const api = {
  baseURL: API_BASE_URL,
  
  async get(url, timeout) {
    const response = await fetchWithTimeout(`${API_BASE_URL}${url}`, {}, timeout);
    return response.json();
  },
  
  async post(url, data, timeout) {
    const response = await fetchWithTimeout(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }, timeout);
    return response.json();
  },
  
  async put(url, data, timeout) {
    const response = await fetchWithTimeout(`${API_BASE_URL}${url}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }, timeout);
    return response.json();
  },
  
  async delete(url, timeout) {
    const response = await fetchWithTimeout(`${API_BASE_URL}${url}`, {
      method: 'DELETE',
    }, timeout);
    return response.json();
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
