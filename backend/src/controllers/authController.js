const authService = require('../services/authService');
const { ErrorCodes } = require('../utils/errorCodes');
const { sendError, sendSuccess } = require('./response');

async function register(req, res) {
  try {
    const result = await authService.registerUser(req.body);
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, err, ErrorCodes.SYSTEM_ERROR, '注册失败，请稍后重试');
  }
}

async function login(req, res) {
  try {
    const result = await authService.loginUser(req.body);
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, err, ErrorCodes.SYSTEM_ERROR, '登录失败，请稍后重试');
  }
}

async function me(req, res) {
  try {
    const result = await authService.getCurrentUser(req.user);
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, err, ErrorCodes.SYSTEM_ERROR, '获取用户信息失败');
  }
}

async function changePassword(req, res) {
  try {
    const result = await authService.changePassword(req.user, req.body);
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, err, ErrorCodes.SYSTEM_ERROR, '修改密码失败');
  }
}

module.exports = {
  changePassword,
  login,
  me,
  register,
};
