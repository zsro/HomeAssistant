const Anthropic = require('@anthropic-ai/sdk');
const BaseAdapter = require('./baseAdapter');

/**
 * Claude 适配器
 */
class ClaudeAdapter extends BaseAdapter {
  constructor(config) {
    super(config);
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
    this.model = config.model || 'claude-3-5-sonnet-20241022';
  }

  async generateTemplate(params) {
    const prompt = this.buildTemplatePrompt(params);
    
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4000,
      temperature: 0.8,
      system: '你是一位专业的儿童教育专家和亲子活动策划师，擅长设计适合 3-8 岁儿童的晚间活动日程。你的回答必须严格遵循 JSON 格式。',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
    });

    const content = response.content[0].text;
    return this.parseResponse(content);
  }

  async optimizeTemplate(template, feedback) {
    const prompt = this.buildOptimizePrompt(template, feedback);
    
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4000,
      temperature: 0.7,
      system: '你是一位专业的儿童教育专家和亲子活动策划师。请根据反馈优化日程模板。',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
    });

    const content = response.content[0].text;
    return this.parseResponse(content);
  }

  async generateActivityVariant(activity, constraints) {
    const prompt = this.buildVariantPrompt(activity, constraints);
    
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 3000,
      temperature: 0.9,
      system: '你是一位专业的儿童教育专家和亲子活动策划师。请生成活动变体。',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
    });

    const content = response.content[0].text;
    return this.parseResponse(content);
  }
}

module.exports = ClaudeAdapter;
