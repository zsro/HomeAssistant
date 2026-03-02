/**
 * AI 服务适配器基类
 * 所有供应商适配器必须继承此类
 */
class BaseAdapter {
  constructor(config) {
    this.config = config;
  }

  /**
   * 生成星星预备班日程模板
   * @param {Object} params - 生成参数
   * @param {number} params.childAge - 孩子年龄
   * @param {string} params.theme - 主题（可选）
   * @param {number} params.duration - 总时长（分钟）
   * @param {string[]} params.preferences - 偏好/兴趣
   * @param {string[]} params.avoidances - 避讳/不喜欢
   * @param {string} params.season - 季节
   * @returns {Promise<Object>} 生成的模板
   */
  async generateTemplate(params) {
    throw new Error('子类必须实现 generateTemplate 方法');
  }

  /**
   * 根据反馈优化模板
   * @param {Object} template - 原模板
   * @param {string} feedback - 用户反馈
   * @returns {Promise<Object>} 优化后的模板
   */
  async optimizeTemplate(template, feedback) {
    throw new Error('子类必须实现 optimizeTemplate 方法');
  }

  /**
   * 生成活动变体
   * @param {Object} activity - 原活动
   * @param {Object} constraints - 约束条件
   * @returns {Promise<Object>} 新的活动
   */
  async generateActivityVariant(activity, constraints) {
    throw new Error('子类必须实现 generateActivityVariant 方法');
  }

  /**
   * 构建生成模板的系统提示词
   */
  buildTemplatePrompt(params) {
    const { childAge, theme, duration = 120, preferences = [], avoidances = [], season = 'spring' } = params;
    
    return `你是一位专业的儿童教育专家和亲子活动策划师，擅长为 3-8 岁儿童设计有趣、有教育意义的晚间活动日程。

请根据以下信息，生成一份完整的「星星预备班」晚间活动日程模板：

【孩子信息】
- 年龄：${childAge} 岁
- 兴趣爱好：${preferences.join('、') || '无特殊偏好'}
- 需要避讳：${avoidances.join('、') || '无'}
- 当前季节：${season}

【日程要求】
- 总时长：约 ${duration} 分钟（19:00-21:00）
- 主题：${theme || '请根据年龄和季节推荐一个合适的主题'}
- 需要包含：热身活动、主题活动、过渡环节、安静时间、睡前准备

【输出格式】
请严格按照以下 JSON 格式输出，不要包含任何其他文字：

{
  "dayOfWeek": "周一",
  "theme": "主题名称",
  "themeDescription": "主题简介",
  "targetSkills": ["培养的能���1", "能力2"],
  "activities": [
    {
      "startTime": "19:00",
      "endTime": "19:10",
      "duration": 10,
      "name": "活动名称",
      "type": "warmup|main|transition|quiet|bedtime",
      "description": "活动描述",
      "steps": ["步骤1", "步骤2", "步骤3"],
      "materials": ["材料1", "材料2"],
      "tips": "给家长的建议",
      "educationalValue": "教育价值说明"
    }
  ],
  "materialsSummary": ["需要准备的所有材料"],
  "overallTips": "整体建议"
}

【设计原则】
1. 活动难度要适合 ${childAge} 岁儿童的认知和动作发展水平
2. 动静交替，避免孩子过度兴奋或疲劳
3. 每个活动要有明确的教育目标
4. 提供具体的操作步骤，让家长容易执行
5. 考虑季节因素，${season} 季节适合的活动
6. 融入孩子的兴趣点：${preferences.join('、') || '根据年龄特点设计'}
7. 避开孩子不喜欢或害怕的内容：${avoidances.join('、') || '无特殊避讳'}`;
  }

  /**
   * 构建优化模板的提示词
   */
  buildOptimizePrompt(template, feedback) {
    return `请根据用户反馈，优化以下星星预备班日程模板。

【原模板】
${JSON.stringify(template, null, 2)}

【用户反馈】
${feedback}

请输出优化后的完整模板，保持相同的 JSON 格式。`;
  }

  /**
   * 构建生成活动变体的提示词
   */
  buildVariantPrompt(activity, constraints) {
    return `请基于以下活动，生成一个新的活动变体。

【原活动】
${JSON.stringify(activity, null, 2)}

【约束条件】
${JSON.stringify(constraints, null, 2)}

请输出新的活动，保持相同格式但内容不同。`;
  }

  /**
   * 解析 AI 返回的内容为 JSON
   */
  parseResponse(content) {
    try {
      // 尝试直接解析
      return JSON.parse(content);
    } catch (e) {
      // 尝试提取 JSON 代码块
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1].trim());
      }
      // 尝试提取花括号内容
      const braceMatch = content.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        return JSON.parse(braceMatch[0]);
      }
      throw new Error('无法解析 AI 返回的内容为 JSON');
    }
  }
}

module.exports = BaseAdapter;
