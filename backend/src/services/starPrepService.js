const db = require('../models/dbAdapter');
const { AIServiceFactory, VolcanoAdapter } = require('./ai');
const { ErrorCodes } = require('../utils/errorCodes');
const {
  calculateConsecutiveDays,
  getMonthRange,
  getTodayString,
  getWeekDates,
  getWeekStart,
  getWeekdayIndex,
} = require('../utils/date');
const {
  serializeCheckin,
  serializeMember,
  serializeTemplateSummary,
} = require('../utils/serializers');
const { createAppError } = require('../utils/appError');

function buildUserMap(users) {
  return new Map(users.map((user) => [user.id, user]));
}

async function loadUserMap(userIds) {
  const users = await db.user.findManyByIds(userIds);
  return buildUserMap(users);
}

function getSelectedProvider(provider) {
  return provider || process.env.AI_PROVIDER || 'openai';
}

function shouldStream(provider, stream) {
  return Boolean(stream && getSelectedProvider(provider) === 'volcano');
}

function validateChildAge(childAge) {
  if (!childAge || childAge < 3 || childAge > 8) {
    throw createAppError(400, ErrorCodes.PARAM_INVALID, 'childAge 是必填参数，必须在 3-8 岁之间');
  }
}

function ensureFamilyUser(user, message = '您还没有加入家庭') {
  if (!user.familyId) {
    throw createAppError(400, ErrorCodes.FAMILY_NOT_FOUND, message);
  }
}

async function getTemplates(user) {
  ensureFamilyUser(user);
  const templates = await db.template.findByFamily(user.familyId);

  return {
    data: {
      templates: templates.map(serializeTemplateSummary),
    },
  };
}

async function getTemplate(user, id) {
  const template = await db.template.findById(id);
  if (!template) {
    throw createAppError(404, ErrorCodes.TEMPLATE_NOT_FOUND);
  }

  if (template.familyId !== user.familyId) {
    throw createAppError(403, ErrorCodes.AUTH_FORBIDDEN, '无权访问该模板');
  }

  return {
    data: { template },
  };
}

async function createTemplate(user, payload) {
  ensureFamilyUser(user);

  const { name, description, activities, weekStart } = payload;
  if (!name || !activities || !Array.isArray(activities)) {
    throw createAppError(400, ErrorCodes.PARAM_MISSING, '请提供模板名称和活动列表');
  }

  await db.template.deactivateAllByFamily(user.familyId);

  const isWeekTemplate = activities.length === 7 && activities[0]?.day && activities[0]?.date;
  const template = await db.template.create({
    familyId: user.familyId,
    name,
    description,
    activities: isWeekTemplate ? null : activities,
    days: isWeekTemplate ? activities : null,
    createdBy: user.id,
    weekStart: weekStart || getWeekStart(),
  });

  return {
    data: { template },
    message: '模板保存成功',
    status: 201,
  };
}

async function applyTemplate(user, id, payload) {
  const { weekStart } = payload;
  const template = await db.template.findById(id);
  if (!template) {
    throw createAppError(404, ErrorCodes.TEMPLATE_NOT_FOUND);
  }

  if (template.familyId !== user.familyId) {
    throw createAppError(403, ErrorCodes.AUTH_FORBIDDEN, '无权访问该模板');
  }

  await db.template.deactivateAllByFamily(user.familyId);
  await db.template.update(id, {
    isActive: true,
    weekStart: weekStart || getWeekStart(),
  });

  const updatedTemplate = await db.template.findById(id);

  return {
    data: { template: updatedTemplate },
    message: '模板应用成功',
  };
}

async function generateWeekTemplate(user, payload) {
  ensureFamilyUser(user);

  const {
    childAge,
    theme,
    duration = 120,
    preferences = [],
    avoidances = [],
    season = 'spring',
    provider,
  } = payload;

  validateChildAge(childAge);

  const aiService = AIServiceFactory.createFromEnv(provider);
  const baseTemplate = await aiService.generateTemplate({
    childAge,
    theme,
    duration,
    preferences,
    avoidances,
    season,
  });

  const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const weekStart = getWeekStart();
  const weekDates = getWeekDates(weekStart);
  const suffixes = ['探索', '冒险', '游戏', '挑战', '派对', '之旅', '时光'];
  const weekActivities = [];

  for (let index = 0; index < 7; index += 1) {
    weekActivities.push({
      day: weekDays[index],
      date: weekDates[index],
      theme: index === 0 ? (theme || baseTemplate.theme) : `${baseTemplate.theme} - 第${index + 1}天`,
      activities: baseTemplate.activities.map((activity) => ({
        ...activity,
        name: index > 0 ? activity.name.replace(/.$/, '') + suffixes[index] : activity.name,
      })),
    });
  }

  return {
    data: {
      template: {
        name: `${baseTemplate.theme} - 一周计划`,
        description: `为${childAge}岁孩子定制的${baseTemplate.theme}一周活动安排`,
        theme: baseTemplate.theme,
        childAge,
        season,
        duration,
        weekStart,
        days: weekActivities,
      },
      provider: getSelectedProvider(provider),
    },
  };
}

async function generateWeekTemplateStream(user, payload, res) {
  ensureFamilyUser(user);

  const {
    childAge,
    theme,
    duration = 120,
    preferences = [],
    avoidances = [],
    season = 'spring',
    provider,
  } = payload;

  validateChildAge(childAge);

  const aiService = AIServiceFactory.createFromEnv(provider);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.write(`data: ${JSON.stringify({ type: 'start', message: '开始生成一周活动模板...' })}\n\n`);

  try {
    if (aiService instanceof VolcanoAdapter) {
      const weekPrompt = `请为${childAge}岁孩子生成一周（7天）的星星预备班活动安排。
主题：${theme || '根据孩子兴趣自动推荐'}
季节：${season}
每天活动时长：${duration}分钟
孩子偏好：${preferences.join(', ') || '无特殊偏好'}
需要避免：${avoidances.join(', ') || '无'}

请生成7天的活动安排，每天包含主题和多个活动环节。返回JSON格式。`;

      let fullContent = '';
      for await (const chunk of aiService.generateTemplateStream({
        childAge,
        theme,
        duration,
        preferences,
        avoidances,
        season,
        customPrompt: weekPrompt,
      })) {
        if (chunk.type === 'content') {
          fullContent += chunk.content;
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk.content })}\n\n`);
        } else if (chunk.type === 'progress') {
          res.write(`data: ${JSON.stringify({ type: 'progress', message: chunk.message })}\n\n`);
        }
      }

      try {
        const weekTemplate = aiService.parseResponse(fullContent);
        res.write(`data: ${JSON.stringify({ type: 'complete', template: weekTemplate })}\n\n`);
      } catch {
        res.write(`data: ${JSON.stringify({ type: 'error', message: '解析模板失败', raw: fullContent })}\n\n`);
      }
    }
  } catch (err) {
    console.error('流式生成一周模板失败:', err);
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
  } finally {
    res.end();
  }
}

async function generateTemplate(payload) {
  const {
    childAge,
    theme,
    duration = 120,
    preferences = [],
    avoidances = [],
    season = 'spring',
    provider,
  } = payload;

  validateChildAge(childAge);

  const aiService = AIServiceFactory.createFromEnv(provider);
  const template = await aiService.generateTemplate({
    childAge,
    theme,
    duration,
    preferences,
    avoidances,
    season,
  });

  return {
    data: {
      template,
      provider: getSelectedProvider(provider),
    },
  };
}

async function generateTemplateStream(payload, res) {
  const {
    childAge,
    theme,
    duration = 120,
    preferences = [],
    avoidances = [],
    season = 'spring',
    provider,
  } = payload;

  validateChildAge(childAge);

  const aiService = AIServiceFactory.createFromEnv(provider);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.write(`data: ${JSON.stringify({ type: 'start', message: '开始生成模板...' })}\n\n`);

  try {
    if (aiService instanceof VolcanoAdapter) {
      let fullContent = '';

      for await (const chunk of aiService.generateTemplateStream({
        childAge,
        theme,
        duration,
        preferences,
        avoidances,
        season,
      })) {
        if (chunk.type === 'content') {
          fullContent += chunk.content;
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk.content })}\n\n`);
        } else if (chunk.type === 'progress') {
          res.write(`data: ${JSON.stringify({ type: 'progress', message: chunk.message })}\n\n`);
        }
      }

      try {
        const template = aiService.parseResponse(fullContent);
        res.write(`data: ${JSON.stringify({ type: 'complete', template })}\n\n`);
      } catch {
        res.write(`data: ${JSON.stringify({ type: 'error', message: '解析模板失败', raw: fullContent })}\n\n`);
      }
    }
  } catch (err) {
    console.error('流式生成模板失败:', err);
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
  } finally {
    res.end();
  }
}

async function optimizeTemplate(payload) {
  const { template, feedback, provider } = payload;

  if (!template || !feedback) {
    throw createAppError(400, ErrorCodes.PARAM_MISSING, 'template 和 feedback 是必填参数');
  }

  const aiService = AIServiceFactory.createFromEnv(provider);
  const optimizedTemplate = await aiService.optimizeTemplate(template, feedback);

  return {
    data: {
      template: optimizedTemplate,
      provider: getSelectedProvider(provider),
    },
  };
}

async function generateActivityVariant(payload) {
  const { activity, constraints = {}, provider } = payload;

  if (!activity) {
    throw createAppError(400, ErrorCodes.PARAM_MISSING, 'activity 是必填参数');
  }

  const aiService = AIServiceFactory.createFromEnv(provider);
  const variant = await aiService.generateActivityVariant(activity, constraints);

  return {
    data: {
      activity: variant,
      provider: getSelectedProvider(provider),
    },
  };
}

function getAIProviders() {
  return {
    data: {
      providers: AIServiceFactory.getSupportedProviders(),
      current: process.env.AI_PROVIDER || 'openai',
    },
  };
}

async function getCheckins(user, query = {}) {
  const { date, startDate, endDate } = query;

  if (!user.familyId) {
    return {
      data: { checkins: [] },
    };
  }

  const checkins = await db.checkin.findByFamily(user.familyId, { date, startDate, endDate });
  const userMap = await loadUserMap(checkins.map((checkin) => checkin.userId));

  return {
    data: {
      checkins: checkins.map((checkin) => serializeCheckin(checkin, userMap.get(checkin.userId))),
    },
  };
}

async function createCheckin(user, payload = {}) {
  ensureFamilyUser(user);

  const { templateId, activityId, date } = payload;
  const today = date || getTodayString();
  const existingCheckin = await db.checkin.findByUserAndDate(user.id, today);

  if (existingCheckin) {
    return {
      data: {
        checkin: serializeCheckin(existingCheckin, user),
        alreadyChecked: true,
      },
      message: '今日已打卡',
    };
  }

  const checkin = await db.checkin.create({
    familyId: user.familyId,
    userId: user.id,
    templateId,
    activityId,
    date: today,
  });

  return {
    data: {
      checkin: serializeCheckin(checkin, user),
    },
    message: '打卡成功',
    status: 201,
  };
}

async function getTodayCheckin(user) {
  const today = getTodayString();

  if (!user.familyId) {
    return {
      data: { checked: false, checkin: null },
    };
  }

  const checkin = await db.checkin.findByUserAndDate(user.id, today);
  return {
    data: {
      checked: Boolean(checkin),
      checkin: checkin ? {
        id: checkin.id,
        date: checkin.date,
        createdAt: checkin.createdAt,
      } : null,
    },
  };
}

async function getCalendar(user, query = {}) {
  const currentYear = query.year ? parseInt(query.year, 10) : new Date().getFullYear();
  const currentMonth = query.month ? parseInt(query.month, 10) : new Date().getMonth() + 1;

  if (!user.familyId) {
    return {
      data: {
        year: currentYear,
        month: currentMonth,
        calendar: [],
        activeTemplate: null,
      },
    };
  }

  const { daysInMonth, startDate, endDate } = getMonthRange(currentYear, currentMonth);
  const activeTemplate = await db.template.findActiveByFamily(user.familyId);
  const checkins = await db.checkin.findByFamily(user.familyId, { startDate, endDate });
  const userMap = await loadUserMap(checkins.map((checkin) => checkin.userId));
  const monthCheckins = new Map();
  const calendar = [];

  for (const checkin of checkins) {
    if (!monthCheckins.has(checkin.date)) {
      monthCheckins.set(checkin.date, new Set());
    }
    monthCheckins.get(checkin.date).add(checkin.userId);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(currentYear, currentMonth - 1, day);
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayOfWeek = date.getDay();

    let hasActivity = false;
    let activityInfo = null;
    if (activeTemplate && activeTemplate.days) {
      const weekDayIndex = getWeekdayIndex(date);
      const dayData = activeTemplate.days[weekDayIndex];
      if (dayData) {
        hasActivity = true;
        activityInfo = {
          theme: dayData.theme,
          activityCount: dayData.activities ? dayData.activities.length : 0,
        };
      }
    }

    const checkedUserIds = monthCheckins.get(dateStr) || new Set();
    const checkedUsers = Array.from(checkedUserIds)
      .map((userId) => serializeMember(userMap.get(userId)))
      .filter(Boolean);

    calendar.push({
      date: dateStr,
      day,
      dayOfWeek,
      hasActivity,
      activityInfo,
      checkedUsers,
      checkedCount: checkedUsers.length,
    });
  }

  return {
    data: {
      year: currentYear,
      month: currentMonth,
      calendar,
      activeTemplate: activeTemplate ? {
        id: activeTemplate.id,
        name: activeTemplate.name,
        weekStart: activeTemplate.weekStart,
      } : null,
    },
  };
}

async function getToday(user) {
  const now = new Date();
  const today = getTodayString();
  const dayOfWeek = now.getDay();
  const weekDayIndex = getWeekdayIndex(now);

  if (!user.familyId) {
    return {
      data: { hasActivity: false },
    };
  }

  const activeTemplate = await db.template.findActiveByFamily(user.familyId);
  if (!activeTemplate) {
    return {
      data: {
        hasActivity: false,
        message: '当前没有活跃的活动模板',
      },
    };
  }

  let todayActivities = null;
  if (activeTemplate.days && activeTemplate.days[weekDayIndex]) {
    todayActivities = activeTemplate.days[weekDayIndex];
  } else if (activeTemplate.activities) {
    todayActivities = {
      day: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dayOfWeek],
      date: today,
      theme: activeTemplate.theme,
      activities: activeTemplate.activities,
    };
  }

  const existingCheckin = await db.checkin.findByUserAndDate(user.id, today);

  return {
    data: {
      hasActivity: Boolean(todayActivities),
      date: today,
      checked: Boolean(existingCheckin),
      template: {
        id: activeTemplate.id,
        name: activeTemplate.name,
      },
      activities: todayActivities,
    },
  };
}

async function getStats(user) {
  if (!user.familyId) {
    return {
      data: {
        totalCheckins: 0,
        streak: 0,
        uniqueDays: 0,
        familyCheckins: [],
      },
    };
  }

  const checkins = await db.checkin.findByFamily(user.familyId);
  let totalCheckins = 0;
  const userCheckinDates = new Set();
  const familyCheckinMap = new Map();
  const familyDatesMap = new Map();

  for (const checkin of checkins) {
    if (checkin.userId === user.id) {
      totalCheckins += 1;
      userCheckinDates.add(checkin.date);
    }

    if (!familyCheckinMap.has(checkin.userId)) {
      familyCheckinMap.set(checkin.userId, 0);
      familyDatesMap.set(checkin.userId, new Set());
    }

    familyCheckinMap.set(checkin.userId, familyCheckinMap.get(checkin.userId) + 1);
    familyDatesMap.get(checkin.userId).add(checkin.date);
  }

  const streak = calculateConsecutiveDays(Array.from(userCheckinDates));
  const userMap = await loadUserMap(Array.from(familyCheckinMap.keys()));
  const familyCheckins = Array.from(familyCheckinMap.entries())
    .map(([userId, count]) => {
      const member = userMap.get(userId);
      if (!member) {
        return null;
      }

      return {
        userId,
        name: member.name,
        role: member.role,
        checkinCount: count,
        uniqueDays: familyDatesMap.get(userId).size,
      };
    })
    .filter(Boolean);

  familyCheckins.sort((left, right) => right.checkinCount - left.checkinCount);

  return {
    data: {
      totalCheckins,
      streak,
      uniqueDays: userCheckinDates.size,
      familyCheckins,
    },
  };
}

module.exports = {
  applyTemplate,
  createCheckin,
  createTemplate,
  generateActivityVariant,
  generateTemplate,
  generateTemplateStream,
  generateWeekTemplate,
  generateWeekTemplateStream,
  getAIProviders,
  getCalendar,
  getCheckins,
  getStats,
  getTemplate,
  getTemplates,
  getToday,
  getTodayCheckin,
  optimizeTemplate,
  shouldStream,
};
