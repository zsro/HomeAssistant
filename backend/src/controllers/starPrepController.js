const starPrepService = require('../services/starPrepService');
const { ErrorCodes } = require('../utils/errorCodes');
const { sendError, sendSuccess } = require('./response');

async function getTemplates(req, res) {
  try {
    return sendSuccess(res, await starPrepService.getTemplates(req.user));
  } catch (err) {
    return sendError(res, err, ErrorCodes.SYSTEM_ERROR, '获取模板列表失败');
  }
}

async function getTemplate(req, res) {
  try {
    return sendSuccess(res, await starPrepService.getTemplate(req.user, req.params.id));
  } catch (err) {
    return sendError(res, err, ErrorCodes.SYSTEM_ERROR, '获取模板详情失败');
  }
}

async function createTemplate(req, res) {
  try {
    return sendSuccess(res, await starPrepService.createTemplate(req.user, req.body));
  } catch (err) {
    return sendError(res, err, ErrorCodes.TEMPLATE_CREATE_FAILED, '保存模板失败');
  }
}

async function applyTemplate(req, res) {
  try {
    return sendSuccess(res, await starPrepService.applyTemplate(req.user, req.params.id, req.body));
  } catch (err) {
    return sendError(res, err, ErrorCodes.TEMPLATE_APPLY_FAILED, '应用模板失败');
  }
}

async function generateWeekTemplate(req, res) {
  try {
    if (starPrepService.shouldStream(req.body.provider, req.body.stream)) {
      await starPrepService.generateWeekTemplateStream(req.user, req.body, res);
      return;
    }

    return sendSuccess(res, await starPrepService.generateWeekTemplate(req.user, req.body));
  } catch (err) {
    if (!res.headersSent) {
      return sendError(res, err, ErrorCodes.TEMPLATE_GENERATE_FAILED, '生成一周模板失败');
    }
    console.error('生成一周模板失败:', err);
  }
}

async function generateTemplate(req, res) {
  try {
    if (starPrepService.shouldStream(req.body.provider, req.body.stream)) {
      await starPrepService.generateTemplateStream(req.body, res);
      return;
    }

    return sendSuccess(res, await starPrepService.generateTemplate(req.body));
  } catch (err) {
    if (!res.headersSent) {
      return sendError(res, err, ErrorCodes.TEMPLATE_GENERATE_FAILED, '生成模板失败');
    }
    console.error('生成模板失败:', err);
  }
}

async function optimizeTemplate(req, res) {
  try {
    return sendSuccess(res, await starPrepService.optimizeTemplate(req.body));
  } catch (err) {
    return sendError(res, err, ErrorCodes.TEMPLATE_UPDATE_FAILED, '优化模板失败');
  }
}

async function generateActivityVariant(req, res) {
  try {
    return sendSuccess(res, await starPrepService.generateActivityVariant(req.body));
  } catch (err) {
    return sendError(res, err, ErrorCodes.TEMPLATE_GENERATE_FAILED, '生成活动变体失败');
  }
}

function getAIProviders(req, res) {
  return sendSuccess(res, starPrepService.getAIProviders());
}

async function getCheckins(req, res) {
  try {
    return sendSuccess(res, await starPrepService.getCheckins(req.user, req.query));
  } catch (err) {
    return sendError(res, err, ErrorCodes.SYSTEM_ERROR, '获取打卡记录失败');
  }
}

async function createCheckin(req, res) {
  try {
    return sendSuccess(res, await starPrepService.createCheckin(req.user, req.body));
  } catch (err) {
    return sendError(res, err, ErrorCodes.CHECKIN_CREATE_FAILED, '打卡失败');
  }
}

async function getTodayCheckin(req, res) {
  try {
    return sendSuccess(res, await starPrepService.getTodayCheckin(req.user));
  } catch (err) {
    return sendError(res, err, ErrorCodes.SYSTEM_ERROR, '检查打卡状态失败');
  }
}

async function getCalendar(req, res) {
  try {
    return sendSuccess(res, await starPrepService.getCalendar(req.user, req.query));
  } catch (err) {
    return sendError(res, err, ErrorCodes.SYSTEM_ERROR, '获取日历失败');
  }
}

async function getToday(req, res) {
  try {
    return sendSuccess(res, await starPrepService.getToday(req.user));
  } catch (err) {
    return sendError(res, err, ErrorCodes.SYSTEM_ERROR, '获取今日活动失败');
  }
}

async function getStats(req, res) {
  try {
    return sendSuccess(res, await starPrepService.getStats(req.user));
  } catch (err) {
    return sendError(res, err, ErrorCodes.SYSTEM_ERROR, '获取统计信息失败');
  }
}

module.exports = {
  applyTemplate,
  createCheckin,
  createTemplate,
  generateActivityVariant,
  generateTemplate,
  generateWeekTemplate,
  getAIProviders,
  getCalendar,
  getCheckins,
  getStats,
  getTemplate,
  getTemplates,
  getToday,
  getTodayCheckin,
  optimizeTemplate,
};
