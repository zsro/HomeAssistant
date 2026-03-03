/**
 * 错误码定义
 * 规范：code = 0 表示成功，非 0 表示错误
 */

const ErrorCodes = {
  // 成功
  SUCCESS: { code: 0, msg: '成功' },

  // 系统错误 (1-999)
  SYSTEM_ERROR: { code: 1, msg: '系统错误' },
  DATABASE_ERROR: { code: 2, msg: '数据库错误' },
  NETWORK_ERROR: { code: 3, msg: '网络错误' },
  TIMEOUT_ERROR: { code: 4, msg: '请求超时' },

  // 认证错误 (1000-1999)
  AUTH_UNAUTHORIZED: { code: 1000, msg: '未登录或登录已过期' },
  AUTH_FORBIDDEN: { code: 1001, msg: '无权限访问' },
  AUTH_TOKEN_INVALID: { code: 1002, msg: '登录令牌无效' },
  AUTH_TOKEN_EXPIRED: { code: 1003, msg: '登录已过期，请重新登录' },

  // 用户错误 (2000-2999)
  USER_NOT_FOUND: { code: 2000, msg: '用户不存在' },
  USER_ALREADY_EXISTS: { code: 2001, msg: '用户名已被注册' },
  USER_PASSWORD_ERROR: { code: 2002, msg: '密码错误' },
  USER_INVALID_USERNAME: { code: 2003, msg: '用户名格式不正确' },
  USER_INVALID_PASSWORD: { code: 2004, msg: '密码格式不正确' },
  USER_INVALID_NAME: { code: 2005, msg: '姓名格式不正确' },

  // 家庭错误 (3000-3999)
  FAMILY_NOT_FOUND: { code: 3000, msg: '家庭不存在' },
  FAMILY_ALREADY_EXISTS: { code: 3001, msg: '家庭已存在' },
  FAMILY_CODE_INVALID: { code: 3002, msg: '家庭邀请码无效' },
  FAMILY_CODE_NOT_FOUND: { code: 3003, msg: '家庭邀请码不存在' },
  FAMILY_MEMBER_EXISTS: { code: 3004, msg: '用户已加入该家庭' },
  FAMILY_CREATE_FAILED: { code: 3005, msg: '创建家庭失败' },
  FAMILY_JOIN_FAILED: { code: 3006, msg: '加入家庭失败' },
  FAMILY_LEAVE_FAILED: { code: 3007, msg: '离开家庭失败' },

  // 模板错误 (4000-4999)
  TEMPLATE_NOT_FOUND: { code: 4000, msg: '模板不存在' },
  TEMPLATE_CREATE_FAILED: { code: 4001, msg: '创建模板失败' },
  TEMPLATE_UPDATE_FAILED: { code: 4002, msg: '更新模板失败' },
  TEMPLATE_DELETE_FAILED: { code: 4003, msg: '删除模板失败' },
  TEMPLATE_APPLY_FAILED: { code: 4004, msg: '应用模板失败' },
  TEMPLATE_GENERATE_FAILED: { code: 4005, msg: '生成模板失败' },
  TEMPLATE_AI_GENERATE_FAILED: { code: 4006, msg: 'AI生成模板失败，请稍后重试' },
  TEMPLATE_NO_ACTIVE: { code: 4007, msg: '当前没有启用的模板' },

  // 打卡错误 (5000-5999)
  CHECKIN_NOT_FOUND: { code: 5000, msg: '打卡记录不存在' },
  CHECKIN_ALREADY_EXISTS: { code: 5001, msg: '今日已打卡' },
  CHECKIN_CREATE_FAILED: { code: 5002, msg: '打卡失败' },
  CHECKIN_ACTIVITY_NOT_FOUND: { code: 5003, msg: '活动不存在' },

  // 参数错误 (9000-9999)
  PARAM_MISSING: { code: 9000, msg: '缺少必要参数' },
  PARAM_INVALID: { code: 9001, msg: '参数格式不正确' },
  PARAM_TYPE_ERROR: { code: 9002, msg: '参数类型错误' },
};

/**
 * 创建成功响应
 * @param {any} data - 响应数据
 * @param {string} msg - 可选的自定义消息
 * @returns {Object} 标准响应格式
 */
function success(data = null, msg = null) {
  return {
    code: ErrorCodes.SUCCESS.code,
    msg: msg || ErrorCodes.SUCCESS.msg,
    data
  };
}

/**
 * 创建错误响应
 * @param {Object} errorCode - 错误码对象
 * @param {string} customMsg - 可选的自定义错误消息
 * @param {any} extra - 可选的额外信息
 * @returns {Object} 标准响应格式
 */
function error(errorCode, customMsg = null, extra = null) {
  const response = {
    code: errorCode.code,
    msg: customMsg || errorCode.msg,
    data: null
  };
  if (extra) {
    response.extra = extra;
  }
  return response;
}

/**
 * 创建自定义错误响应
 * @param {number} code - 错误码
 * @param {string} msg - 错误消息
 * @returns {Object} 标准响应格式
 */
function customError(code, msg) {
  return {
    code,
    msg,
    data: null
  };
}

module.exports = {
  ErrorCodes,
  success,
  error,
  customError
};
