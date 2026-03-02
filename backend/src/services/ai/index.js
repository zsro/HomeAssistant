const OpenAIAdapter = require('./openaiAdapter');
const ClaudeAdapter = require('./claudeAdapter');
const DeepSeekAdapter = require('./deepseekAdapter');
const MockAdapter = require('./mockAdapter');
const VolcanoAdapter = require('./volcanoAdapter');

/**
 * AI 服务工厂
 * 根据配置创建对应的适配器实例
 */
class AIServiceFactory {
  static adapters = {
    openai: OpenAIAdapter,
    claude: ClaudeAdapter,
    deepseek: DeepSeekAdapter,
    mock: MockAdapter,
    volcano: VolcanoAdapter,
  };

  /**
   * 创建 AI 服务实例
   * @param {string} provider - 供应商名称 (openai/claude)
   * @param {Object} config - 配置对象
   * @returns {BaseAdapter} 适配器实例
   */
  static create(provider, config) {
    const AdapterClass = this.adapters[provider];
    if (!AdapterClass) {
      throw new Error(`不支持的 AI 供应商: ${provider}。支持的供应商: ${Object.keys(this.adapters).join(', ')}`);
    }
    return new AdapterClass(config);
  }

  /**
   * 从环境变量创建 AI 服务实例
   * @param {string} provider - 可选，指定供应商，否则使用环境变量
   * @returns {BaseAdapter} 适配器实例
   */
  static createFromEnv(provider) {
    const selectedProvider = provider || process.env.AI_PROVIDER || 'openai';
    
    const config = {
      apiKey: process.env.AI_API_KEY,
      model: process.env.AI_MODEL,
      baseURL: process.env.AI_BASE_URL,
    };

    if (!config.apiKey) {
      throw new Error('请设置 AI_API_KEY 环境变量');
    }

    return this.create(selectedProvider, config);
  }

  /**
   * 注册新的适配器
   * @param {string} name - 供应商名称
   * @param {Class} AdapterClass - 适配器类
   */
  static register(name, AdapterClass) {
    this.adapters[name] = AdapterClass;
  }

  /**
   * 获取支持的供应商列表
   */
  static getSupportedProviders() {
    return Object.keys(this.adapters);
  }
}

// 导出工厂类和适配器类
module.exports = {
  AIServiceFactory,
  OpenAIAdapter,
  ClaudeAdapter,
  DeepSeekAdapter,
  MockAdapter,
  VolcanoAdapter,
  BaseAdapter: require('./baseAdapter'),
};
