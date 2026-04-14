const pinyinService = require('../services/pinyinService');
const { ErrorCodes } = require('../utils/errorCodes');
const { sendError, sendSuccess } = require('./response');

async function getOverview(req, res) {
  try {
    return sendSuccess(res, await pinyinService.getOverview(req.user));
  } catch (error) {
    return sendError(res, error, ErrorCodes.SYSTEM_ERROR, '获取拼音课程失败');
  }
}

async function getSummary(req, res) {
  try {
    return sendSuccess(res, await pinyinService.getSummary(req.user));
  } catch (error) {
    return sendError(res, error, ErrorCodes.SYSTEM_ERROR, '获取拼音进度失败');
  }
}

async function completeLesson(req, res) {
  try {
    return sendSuccess(res, await pinyinService.completeLesson(req.user, req.body));
  } catch (error) {
    return sendError(res, error, ErrorCodes.SYSTEM_ERROR, '记录拼音课程进度失败');
  }
}

module.exports = {
  completeLesson,
  getOverview,
  getSummary,
};
