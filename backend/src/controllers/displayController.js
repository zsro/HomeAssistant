const displayService = require('../services/displayService');
const { ErrorCodes } = require('../utils/errorCodes');
const { sendError, sendSuccess } = require('./response');

async function createSession(req, res) {
  try {
    const result = await displayService.createSession();
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, err, ErrorCodes.SYSTEM_ERROR, '创建展示会话失败');
  }
}

async function getSession(req, res) {
  try {
    const result = await displayService.getSession({
      token: req.displayToken,
      decoded: req.displayAuth,
      session: req.displaySession,
    });
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, err, ErrorCodes.SYSTEM_ERROR, '获取展示会话失败');
  }
}

async function refreshSession(req, res) {
  try {
    const result = await displayService.refreshSession(req.displaySession);
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, err, ErrorCodes.SYSTEM_ERROR, '刷新配对码失败');
  }
}

async function heartbeat(req, res) {
  try {
    const result = await displayService.heartbeat(req.displaySession);
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, err, ErrorCodes.SYSTEM_ERROR, '更新展示端状态失败');
  }
}

async function getDisplayState(req, res) {
  try {
    const result = await displayService.getDisplayState(req.displaySession);
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, err, ErrorCodes.SYSTEM_ERROR, '获取展示状态失败');
  }
}

async function pairDisplay(req, res) {
  try {
    const result = await displayService.pairDisplay(req.user, req.body);
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, err, ErrorCodes.SYSTEM_ERROR, '绑定展示端失败');
  }
}

async function getDevices(req, res) {
  try {
    const result = await displayService.getDevices(req.user);
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, err, ErrorCodes.SYSTEM_ERROR, '获取展示设备失败');
  }
}

async function getDeviceState(req, res) {
  try {
    const result = await displayService.getDeviceState(req.user, req.params.deviceId);
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, err, ErrorCodes.SYSTEM_ERROR, '获取展示设备状态失败');
  }
}

async function updateDeviceState(req, res) {
  try {
    const result = await displayService.updateDeviceState(req.user, req.params.deviceId, req.body);
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, err, ErrorCodes.SYSTEM_ERROR, '更新展示设备状态失败');
  }
}

module.exports = {
  createSession,
  getDeviceState,
  getDevices,
  getDisplayState,
  getSession,
  heartbeat,
  pairDisplay,
  refreshSession,
  updateDeviceState,
};
