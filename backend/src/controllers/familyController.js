const familyService = require('../services/familyService');
const { ErrorCodes } = require('../utils/errorCodes');
const { sendError, sendSuccess } = require('./response');

async function getFamily(req, res) {
  try {
    const result = await familyService.getFamily(req.user);
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, err, ErrorCodes.SYSTEM_ERROR, '获取家庭信息失败');
  }
}

async function getMembers(req, res) {
  try {
    const result = await familyService.getMembers(req.user);
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, err, ErrorCodes.SYSTEM_ERROR, '获取家庭成员失败');
  }
}

async function updateFamily(req, res) {
  try {
    const result = await familyService.updateFamily(req.user, req.body);
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, err, ErrorCodes.SYSTEM_ERROR, '更新家庭信息失败');
  }
}

async function joinFamily(req, res) {
  try {
    const result = await familyService.joinFamily(req.user, req.body);
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, err, ErrorCodes.FAMILY_JOIN_FAILED, '加入家庭失败');
  }
}

async function leaveFamily(req, res) {
  try {
    const result = await familyService.leaveFamily(req.user);
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, err, ErrorCodes.FAMILY_LEAVE_FAILED, '离开家庭失败');
  }
}

async function createFamily(req, res) {
  try {
    const result = await familyService.createFamily(req.user, req.body);
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, err, ErrorCodes.FAMILY_CREATE_FAILED, '创建家庭失败');
  }
}

module.exports = {
  createFamily,
  getFamily,
  getMembers,
  joinFamily,
  leaveFamily,
  updateFamily,
};
