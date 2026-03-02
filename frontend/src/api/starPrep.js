import { api } from './config';

export const starPrepApi = {
  // 获取活动模板
  getTemplates: () => api.get('/star-prep/templates'),
  
  // 创建活动模板
  createTemplate: (data) => api.post('/star-prep/templates', data),
  
  // 获取活动记录
  getRecords: () => api.get('/star-prep/records'),
  
  // 创建活动记录
  createRecord: (data) => api.post('/star-prep/records', data),
  
  // 获取统计
  getStats: () => api.get('/star-prep/stats'),
};
