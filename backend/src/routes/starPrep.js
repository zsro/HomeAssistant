const express = require('express');
const { AIServiceFactory } = require('../services/ai');
const db = require('../models/dbAdapter');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// 获取当前周的开始日期（周一）
function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 调整为周一开始
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
}

// 获取一周的日期数组
function getWeekDates(weekStart) {
  const dates = [];
  const start = new Date(weekStart);
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

// 获取活动模板列表
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.familyId) {
      return res.status(400).json({ error: '您还没有加入家庭' });
    }

    // 获取家庭的所有模板
    const templates = await db.template.findByFamily(user.familyId);
    const templateList = templates.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      weekStart: template.weekStart,
      isActive: template.isActive,
      createdAt: template.createdAt,
    }));

    // 按创建时间倒序
    templateList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      data: { templates: templateList },
    });
  } catch (error) {
    console.error('获取模板列表失败:', error);
    res.status(500).json({ error: '获取模板列表失败' });
  }
});

// 获取单个模板详情
router.get('/templates/:id', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const template = await db.template.findById(id);
    if (!template) {
      return res.status(404).json({ error: '模板不存在' });
    }

    if (template.familyId !== user.familyId) {
      return res.status(403).json({ error: '无权访问该模板' });
    }

    res.json({
      success: true,
      data: { template },
    });
  } catch (error) {
    console.error('获取模板详情失败:', error);
    res.status(500).json({ error: '获取模板详情失败' });
  }
});

// 创建/保存活动模板
router.post('/templates', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { name, description, activities, weekStart } = req.body;

    if (!user.familyId) {
      return res.status(400).json({ error: '您还没有加入家庭' });
    }

    if (!name || !activities || !Array.isArray(activities)) {
      return res.status(400).json({ error: '请提供模板名称和活动列表' });
    }

    // 停用该家庭其他活跃模板
    await db.template.deactivateAllByFamily(user.familyId);

    // 判断是一周模板还是单日模板
    // 一周模板的 activities 是7天的数组，每项有 day, date, theme, activities
    const isWeekTemplate = activities.length === 7 && activities[0]?.day && activities[0]?.date;

    // 创建新模板
    const template = await db.template.create({
      familyId: user.familyId,
      name,
      description,
      activities: isWeekTemplate ? null : activities,  // 单日模板存储在 activities
      days: isWeekTemplate ? activities : null,         // 一周模板存储在 days
      createdBy: user.id,
      weekStart: weekStart || getWeekStart(),
    });

    res.status(201).json({
      success: true,
      message: '模板保存成功',
      data: { template },
    });
  } catch (error) {
    console.error('保存模板失败:', error);
    res.status(500).json({ error: '保存模板失败' });
  }
});

// 应用模板到指定周
router.post('/templates/:id/apply', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { weekStart } = req.body;

    const template = await db.template.findById(id);
    if (!template) {
      return res.status(404).json({ error: '模板不存在' });
    }

    if (template.familyId !== user.familyId) {
      return res.status(403).json({ error: '无权访问该模板' });
    }

    // 停用其他活跃模板
    await db.template.deactivateAllByFamily(user.familyId);

    // 激活当前模板
    await db.template.update(id, {
      isActive: true,
      weekStart: weekStart || getWeekStart(),
    });

    // 重新获取更新后的模板
    const updatedTemplate = await db.template.findById(id);

    res.json({
      success: true,
      message: '模板应用成功',
      data: { template: updatedTemplate },
    });
  } catch (error) {
    console.error('应用模板失败:', error);
    res.status(500).json({ error: '应用模板失败' });
  }
});

// AI 生成一周模板（支持流式响应）
router.post('/templates/generate-week', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const {
      childAge,
      theme,
      duration = 120,
      preferences = [],
      avoidances = [],
      season = 'spring',
      provider,
      stream = false,
    } = req.body;

    if (!user.familyId) {
      return res.status(400).json({ error: '您还没有加入家庭' });
    }

    // 验证必填参数
    if (!childAge || childAge < 3 || childAge > 8) {
      return res.status(400).json({
        error: 'childAge 是必填参数，必须在 3-8 岁之间'
      });
    }

    // 创建 AI 服务实例
    const aiService = AIServiceFactory.createFromEnv(provider);

    // 生成一周的活动
    const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    let weekActivities = [];

    // 如果启用流式响应且是火山引擎
    if (stream && (provider === 'volcano' || (!provider && process.env.AI_PROVIDER === 'volcano'))) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      res.write(`data: ${JSON.stringify({ type: 'start', message: '开始生成一周活动模板...' })}\n\n`);

      const { VolcanoAdapter } = require('../services/ai');
      if (aiService instanceof VolcanoAdapter) {
        // 构建一周生成的提示词
        const weekPrompt = `请为${childAge}岁孩子生成一周（7天）的星星预备班活动安排。
主题：${theme || '根据孩子兴趣自动推荐'}
季节：${season}
每天活动时长：${duration}分钟
孩子偏好：${preferences.join(', ') || '无特殊偏好'}
需要避免：${avoidances.join(', ') || '无'}

请生成7天的活动安排，每天包含主题和多个活动环节。返回JSON格式。`;

        let fullContent = '';
        for await (const chunk of aiService.generateTemplateStream({
          childAge, theme, duration, preferences, avoidances, season,
          customPrompt: weekPrompt
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
        } catch (parseError) {
          res.write(`data: ${JSON.stringify({ type: 'error', message: '解析模板失败', raw: fullContent })}\n\n`);
        }
      }
      res.end();
      return;
    }

    // 普通响应 - 生成一周模板
    // 先生成基础模板
    const baseTemplate = await aiService.generateTemplate({
      childAge,
      theme,
      duration,
      preferences,
      avoidances,
      season,
    });

    // 构建一周的活动（基于基础模板，每天略有变化）
    const weekStart = getWeekStart();
    const weekDates = getWeekDates(weekStart);
    
    for (let i = 0; i < 7; i++) {
      weekActivities.push({
        day: weekDays[i],
        date: weekDates[i],
        theme: i === 0 ? (theme || baseTemplate.theme) : `${baseTemplate.theme} - 第${i + 1}天`,
        activities: baseTemplate.activities.map((activity, idx) => ({
          ...activity,
          // 每天稍微调整活动名称
          name: i > 0 ? activity.name.replace(/.$/, '') + ['探索', '冒险', '游戏', '挑战', '派对', '之旅', '时光'][i] : activity.name,
        })),
      });
    }

    const weekTemplate = {
      name: `${baseTemplate.theme} - 一周计划`,
      description: `为${childAge}岁孩子定制的${baseTemplate.theme}一周活动安排`,
      theme: baseTemplate.theme,
      childAge,
      season,
      duration,
      weekStart,
      days: weekActivities,
    };

    res.json({
      success: true,
      template: weekTemplate,
      provider: provider || process.env.AI_PROVIDER || 'openai',
    });
  } catch (error) {
    console.error('生成一周模板失败:', error);
    res.status(500).json({
      error: '生成一周模板失败',
      message: error.message,
    });
  }
});

// AI 生成单日模板（原有接口保留）
router.post('/templates/generate', async (req, res) => {
  try {
    const {
      childAge,
      theme,
      duration = 120,
      preferences = [],
      avoidances = [],
      season = 'spring',
      provider,
      stream = false,
    } = req.body;

    // 验证必填参数
    if (!childAge || childAge < 3 || childAge > 8) {
      return res.status(400).json({
        error: 'childAge 是必填参数，必须在 3-8 岁之间'
      });
    }

    // 创建 AI 服务实例
    const aiService = AIServiceFactory.createFromEnv(provider);

    // 如果启用流式响应且是火山引擎
    if (stream && (provider === 'volcano' || (!provider && process.env.AI_PROVIDER === 'volcano'))) {
      return await handleStreamGenerate(req, res, aiService, {
        childAge, theme, duration, preferences, avoidances, season
      });
    }

    // 普通响应
    const template = await aiService.generateTemplate({
      childAge,
      theme,
      duration,
      preferences,
      avoidances,
      season,
    });

    res.json({
      success: true,
      template,
      provider: provider || process.env.AI_PROVIDER || 'openai',
    });
  } catch (error) {
    console.error('生成模板失败:', error);
    res.status(500).json({
      error: '生成模板失败',
      message: error.message,
    });
  }
});

// 处理流式生成
async function handleStreamGenerate(req, res, aiService, params) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    // 发送开始事件
    res.write(`data: ${JSON.stringify({ type: 'start', message: '开始生成模板...' })}\n\n`);

    // 使用火山引擎的流式生成
    const { VolcanoAdapter } = require('../services/ai');
    if (aiService instanceof VolcanoAdapter) {
      let fullContent = '';
      
      for await (const chunk of aiService.generateTemplateStream(params)) {
        if (chunk.type === 'content') {
          fullContent += chunk.content;
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk.content })}\n\n`);
        } else if (chunk.type === 'progress') {
          res.write(`data: ${JSON.stringify({ type: 'progress', message: chunk.message })}\n\n`);
        }
      }

      // 解析完整内容
      try {
        const template = aiService.parseResponse(fullContent);
        res.write(`data: ${JSON.stringify({ type: 'complete', template })}\n\n`);
      } catch (parseError) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: '解析模板失败', raw: fullContent })}\n\n`);
      }
    }

    res.end();
  } catch (error) {
    console.error('流式生成失败:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
}

// AI 优化模板
router.post('/templates/optimize', async (req, res) => {
  try {
    const { template, feedback, provider } = req.body;

    if (!template || !feedback) {
      return res.status(400).json({
        error: 'template 和 feedback 是必填参数'
      });
    }

    const aiService = AIServiceFactory.createFromEnv(provider);
    const optimizedTemplate = await aiService.optimizeTemplate(template, feedback);

    res.json({
      success: true,
      template: optimizedTemplate,
      provider: provider || process.env.AI_PROVIDER || 'openai',
    });
  } catch (error) {
    console.error('优化模板失败:', error);
    res.status(500).json({
      error: '优化模板失败',
      message: error.message,
    });
  }
});

// AI 生成活动变体
router.post('/activities/variant', async (req, res) => {
  try {
    const { activity, constraints = {}, provider } = req.body;

    if (!activity) {
      return res.status(400).json({
        error: 'activity 是必填参数'
      });
    }

    const aiService = AIServiceFactory.createFromEnv(provider);
    const variant = await aiService.generateActivityVariant(activity, constraints);

    res.json({
      success: true,
      activity: variant,
      provider: provider || process.env.AI_PROVIDER || 'openai',
    });
  } catch (error) {
    console.error('生成活动变体失败:', error);
    res.status(500).json({
      error: '生成活动变体失败',
      message: error.message,
    });
  }
});

// 获取支持的 AI 供应商
router.get('/ai-providers', (req, res) => {
  res.json({
    providers: AIServiceFactory.getSupportedProviders(),
    current: process.env.AI_PROVIDER || 'openai',
  });
});

// ========== 打卡记录 API ==========

// 获取打卡记录
router.get('/checkins', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { date, startDate, endDate } = req.query;

    if (!user.familyId) {
      return res.json({ success: true, data: { checkins: [] } });
    }

    const checkins = await db.checkin.findByFamily(user.familyId, { date, startDate, endDate });
    
    // 获取用户信息
    const checkinList = [];
    for (const checkin of checkins) {
      const userInfo = await db.user.findById(checkin.userId);
      checkinList.push({
        id: checkin.id,
        userId: checkin.userId,
        userName: userInfo ? userInfo.name : '未知用户',
        userRole: userInfo ? userInfo.role : 'unknown',
        templateId: checkin.templateId,
        activityId: checkin.activityId,
        date: checkin.date,
        createdAt: checkin.createdAt,
      });
    }

    res.json({
      success: true,
      data: { checkins: checkinList },
    });
  } catch (error) {
    console.error('获取打卡记录失败:', error);
    res.status(500).json({ error: '获取打卡记录失败' });
  }
});

// 创建打卡记录（进入模块即打卡）
router.post('/checkins', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { templateId, activityId, date } = req.body;

    if (!user.familyId) {
      return res.status(400).json({ error: '您还没有加入家庭' });
    }

    const today = date || new Date().toISOString().split('T')[0];

    // 检查今天是否已打卡
    const existingCheckin = await db.checkin.findByUserAndDate(user.id, today);

    if (existingCheckin) {
      return res.json({
        success: true,
        message: '今日已打卡',
        data: { checkin: existingCheckin, alreadyChecked: true },
      });
    }

    // 创建新打卡记录
    const checkin = await db.checkin.create({
      familyId: user.familyId,
      userId: user.id,
      templateId,
      activityId,
      date: today,
    });

  res.status(201).json({
    success: true,
    message: '打卡成功',
    data: {
      checkin: {
        id: checkin.id,
        userId: checkin.userId,
        userName: user.name,
        userRole: user.role,
        templateId: checkin.templateId,
        activityId: checkin.activityId,
        date: checkin.date,
        createdAt: checkin.createdAt,
      },
    },
  });
  } catch (error) {
    console.error('打卡失败:', error);
    res.status(500).json({ error: '打卡失败' });
  }
});

// 检查今日打卡状态
router.get('/checkins/today', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const today = new Date().toISOString().split('T')[0];

    if (!user.familyId) {
      return res.json({
        success: true,
        data: { checked: false, checkin: null },
      });
    }

    const checkin = await db.checkin.findByUserAndDate(user.id, today);

    res.json({
      success: true,
      data: {
        checked: !!checkin,
        checkin: checkin ? {
          id: checkin.id,
          date: checkin.date,
          createdAt: checkin.createdAt,
        } : null,
      },
    });
  } catch (error) {
    console.error('检查打卡状态失败:', error);
    res.status(500).json({ error: '检查打卡状态失败' });
  }
});

// ========== 日历 API ==========

// 获取日历数据（包含模板和打卡信息）
router.get('/calendar', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { year, month } = req.query;

    if (!user.familyId) {
      return res.json({
        success: true,
        data: { calendar: [] },
      });
    }

    const currentYear = year ? parseInt(year) : new Date().getFullYear();
    const currentMonth = month ? parseInt(month) - 1 : new Date().getMonth();

    // 获取该月的所有日期
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const calendar = [];

    // 获取活跃模板
    const activeTemplate = await db.template.findActiveByFamily(user.familyId);

    // 获取该月所有打卡记录
    const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    const checkins = await db.checkin.findByFamily(user.familyId, { startDate, endDate });
    
    const monthCheckins = new Map(); // date -> userIds[]
    for (const checkin of checkins) {
      if (!monthCheckins.has(checkin.date)) {
        monthCheckins.set(checkin.date, new Set());
      }
      monthCheckins.get(checkin.date).add(checkin.userId);
    }

    // 构建日历数据
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const date = new Date(currentYear, currentMonth, day);
      const dayOfWeek = date.getDay(); // 0=周日, 1=周一...
      
      // 判断是否有模板活动
      let hasActivity = false;
      let activityInfo = null;
      if (activeTemplate && activeTemplate.days) {
        const weekDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 转换为周一开始
        const dayData = activeTemplate.days[weekDayIndex];
        if (dayData) {
          hasActivity = true;
          activityInfo = {
            theme: dayData.theme,
            activityCount: dayData.activities ? dayData.activities.length : 0,
          };
        }
      }

      // 获取当天打卡的家庭成员
      const checkedUsers = [];
      const checkedUserIds = monthCheckins.get(dateStr);
      if (checkedUserIds) {
        for (const userId of checkedUserIds) {
          const member = await db.user.findById(userId);
          if (member) {
            checkedUsers.push({
              id: member.id,
              name: member.name,
              role: member.role,
            });
          }
        }
      }

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

    res.json({
      success: true,
    data: {
      year: currentYear,
      month: currentMonth + 1,
      calendar,
      activeTemplate: activeTemplate ? {
        id: activeTemplate.id,
        name: activeTemplate.name,
        weekStart: activeTemplate.weekStart,
      } : null,
    },
  });
  } catch (error) {
    console.error('获取日历失败:', error);
    res.status(500).json({ error: '获取日历失败' });
  }
});

// 获取今日活动
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const today = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().getDay();
    const weekDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    if (!user.familyId) {
      return res.json({
        success: true,
        data: { hasActivity: false },
      });
    }

    // 获取活跃模板
    const activeTemplate = await db.template.findActiveByFamily(user.familyId);

    if (!activeTemplate) {
      return res.json({
        success: true,
        data: { hasActivity: false, message: '当前没有活跃的活动模板' },
      });
    }

    // 获取今日活动
    let todayActivities = null;
    if (activeTemplate.days && activeTemplate.days[weekDayIndex]) {
      todayActivities = activeTemplate.days[weekDayIndex];
    } else if (activeTemplate.activities) {
      // 单日模板格式
      todayActivities = {
        day: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dayOfWeek],
        date: today,
        theme: activeTemplate.theme,
        activities: activeTemplate.activities,
      };
    }

    // 检查今日是否已打卡
    const existingCheckin = await db.checkin.findByUserAndDate(user.id, today);
    const checked = !!existingCheckin;

    res.json({
      success: true,
      data: {
        hasActivity: !!todayActivities,
        date: today,
        checked,
        template: {
          id: activeTemplate.id,
          name: activeTemplate.name,
        },
        activities: todayActivities,
      },
    });
  } catch (error) {
    console.error('获取今日活动失败:', error);
    res.status(500).json({ error: '获取今日活动失败' });
  }
});

// ========== 统计 API ==========

// 获取统计信息
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    if (!user.familyId) {
      return res.json({
        success: true,
        data: {
          totalCheckins: 0,
          streak: 0,
          familyCheckins: [],
        },
      });
    }

    // 获取家庭所有打卡记录
    const checkins = await db.checkin.findByFamily(user.familyId);

    // 统计个人打卡
    let totalCheckins = 0;
    const userCheckinDates = new Set();
    
    // 统计家庭打卡
    const familyCheckinMap = new Map(); // userId -> count
    const familyDatesMap = new Map(); // userId -> Set<dates>

    for (const checkin of checkins) {
      if (checkin.userId === user.id) {
        totalCheckins++;
        userCheckinDates.add(checkin.date);
      }

      // 家庭统计
      if (!familyCheckinMap.has(checkin.userId)) {
        familyCheckinMap.set(checkin.userId, 0);
        familyDatesMap.set(checkin.userId, new Set());
      }
      familyCheckinMap.set(checkin.userId, familyCheckinMap.get(checkin.userId) + 1);
      familyDatesMap.get(checkin.userId).add(checkin.date);
    }

    // 计算连续打卡天数
    const sortedDates = Array.from(userCheckinDates).sort();
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    if (sortedDates.includes(today) || sortedDates.includes(yesterday)) {
      streak = 1;
      for (let i = sortedDates.length - 1; i > 0; i--) {
        const curr = new Date(sortedDates[i]);
        const prev = new Date(sortedDates[i - 1]);
        const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
        if (diffDays === 1) {
          streak++;
        } else {
          break;
        }
      }
    }

    // 构建家庭统计
    const familyCheckins = [];
    for (const [userId, count] of familyCheckinMap) {
      const member = await db.user.findById(userId);
      if (member) {
        familyCheckins.push({
          userId,
          name: member.name,
          role: member.role,
          checkinCount: count,
          uniqueDays: familyDatesMap.get(userId).size,
        });
      }
    }

    // 按打卡次数排序
    familyCheckins.sort((a, b) => b.checkinCount - a.checkinCount);

    res.json({
      success: true,
      data: {
        totalCheckins,
        streak,
        uniqueDays: userCheckinDates.size,
        familyCheckins,
      },
    });
  } catch (error) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({ error: '获取统计信息失败' });
  }
});

module.exports = router;
