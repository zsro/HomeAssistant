const BaseAdapter = require('./baseAdapter');

// 兼容 Node.js 版本，使用动态导入 fetch
let fetch;
if (globalThis.fetch) {
  fetch = globalThis.fetch;
} else {
  // Node 18+ 有原生 fetch，低于此版本需要 polyfill
  fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
}

/**
 * 火山引擎适配器
 * 使用 Ark Responses API
 */
class VolcanoAdapter extends BaseAdapter {
  constructor(config) {
    super(config);
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || 'https://ark.cn-beijing.volces.com/api/v3';
    this.model = config.model || 'deepseek-v3-2-251201';
  }

  async generateTemplate(params) {
    console.log('[VolcanoAdapter] 开始生成模板，参数:', params);
    const prompt = this.buildTemplatePrompt(params);
    console.log('[VolcanoAdapter] Prompt 长度:', prompt.length);
    
    console.log('[VolcanoAdapter] 准备调用 API...');
    const fetchImpl = await fetch;
    console.log('[VolcanoAdapter] Fetch 实现:', typeof fetchImpl);
    
    const response = await fetchImpl(`${this.baseURL}/responses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text: '你是一位专业的儿童教育专家和亲子活动策划师，擅长设计适合 3-8 岁儿童的晚间活动日程。你的回答必须严格遵循 JSON 格式。'
              }
            ]
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: prompt
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API 请求失败: ${response.status} ${error}`);
    }

    const data = await response.json();
    const content = data.output?.[0]?.content?.[0]?.text || data.output?.[0]?.content;
    return this.parseResponse(content);
  }

  /**
   * 流式生成模板
   * @param {Object} params - 生成参数
   * @yields {Object} 流式数据块
   */
  async *generateTemplateStream(params) {
    const prompt = this.buildTemplatePrompt(params);
    
    yield { type: 'progress', message: '正在连接 AI 服务...' };

    const fetchImpl = await fetch;
    const response = await fetchImpl(`${this.baseURL}/responses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        stream: true,
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text: '你是一位专业的儿童教育专家和亲子活动策划师，擅长设计适合 3-8 岁儿童的晚间活动日程。你的回答必须严格遵循 JSON 格式。'
              }
            ]
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: prompt
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API 请求失败: ${response.status} ${error}`);
    }

    yield { type: 'progress', message: 'AI 开始生成内容...' };

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let contentBuffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.output?.[0]?.content?.[0]?.text || '';
              if (delta) {
                contentBuffer += delta;
                yield { type: 'content', content: delta };
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield { type: 'progress', message: '生成完成，正在解析...' };
  }

  async optimizeTemplate(template, feedback) {
    const prompt = this.buildOptimizePrompt(template, feedback);
    
    const fetchImpl = await fetch;
    const response = await fetchImpl(`${this.baseURL}/responses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text: '你是一位专业的儿童教育专家和亲子活动策划师。请根据反馈优化日程模板。'
              }
            ]
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: prompt
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API 请求失败: ${response.status} ${error}`);
    }

    const data = await response.json();
    const content = data.output?.[0]?.content?.[0]?.text || data.output?.[0]?.content;
    return this.parseResponse(content);
  }

  async generateActivityVariant(activity, constraints) {
    const prompt = this.buildVariantPrompt(activity, constraints);
    
    const fetchImpl = await fetch;
    const response = await fetchImpl(`${this.baseURL}/responses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text: '你是一位专业的儿童教育专家和亲子活动策划师。请生成活动变体。'
              }
            ]
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: prompt
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API 请求失败: ${response.status} ${error}`);
    }

    const data = await response.json();
    const content = data.output?.[0]?.content?.[0]?.text || data.output?.[0]?.content;
    return this.parseResponse(content);
  }
}

module.exports = VolcanoAdapter;
