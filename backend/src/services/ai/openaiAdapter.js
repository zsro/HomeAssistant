const OpenAI = require('openai');
const BaseAdapter = require('./baseAdapter');

/**
 * OpenAI 适配器
 */
class OpenAIAdapter extends BaseAdapter {
  constructor(config) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL, // 可选，用于代理或第三方兼容服务
    });
    this.model = config.model || 'gpt-4o-mini';
  }

  async generateTemplate(params) {
    const prompt = this.buildTemplatePrompt(params);
    
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: '你是一位专业的儿童教育专家和亲子活动策划师，擅长设计适合 3-8 岁儿童的晚间活动日程。你的回答必须严格遵循 JSON 格式。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 3000,
    });

    const content = response.choices[0].message.content;
    return this.parseResponse(content);
  }

  async optimizeTemplate(template, feedback) {
    const prompt = this.buildOptimizePrompt(template, feedback);
    
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: '你是一位专业的儿童教育专家和亲子活动策划师。请根据反馈优化日程模板。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    const content = response.choices[0].message.content;
    return this.parseResponse(content);
  }

  async generateActivityVariant(activity, constraints) {
    const prompt = this.buildVariantPrompt(activity, constraints);
    
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: '你是一位专业的儿童教育专家和亲子活动策划师。请生成活动变体。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.9,
      max_tokens: 2000,
    });

    const content = response.choices[0].message.content;
    return this.parseResponse(content);
  }
}

module.exports = OpenAIAdapter;
