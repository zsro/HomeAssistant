const BaseAdapter = require('./baseAdapter');

/**
 * Mock 适配器
 * 用于测试和演示，无需真实 API Key
 */
class MockAdapter extends BaseAdapter {
  constructor(config) {
    super(config);
    this.model = 'mock-model';
  }

  async generateTemplate(params) {
    const { childAge, theme, preferences = [] } = params;
    
    // 根据参数生成模拟数据
    const selectedTheme = theme || '创意探索';
    const interestPrefix = preferences.length > 0 ? preferences[0] : '趣味';
    
    return {
      dayOfWeek: '周一',
      theme: `${interestPrefix}${selectedTheme}`,
      themeDescription: `专为${childAge}岁儿童设计的${selectedTheme}主题晚间活动`,
      targetSkills: ['精细动作', '创造力', '专注力', '语言表达能力'],
      activities: [
        {
          startTime: '19:00',
          endTime: '19:10',
          name: '热身律动',
          type: 'warmup',
          description: '通过音乐和简单的动作，让孩子从白天的兴奋状态逐渐平静下来',
          steps: [
            '播放轻柔的背景音乐',
            '家长和孩子一起做简单的伸展运动',
            '模仿小动物走路（小兔子跳、小鸭子走）'
          ],
          materials: ['手机/音响', '舒适的地垫'],
          tips: '动作要轻柔，不要让孩子过于兴奋',
          educationalValue: '帮助孩子过渡情绪，准备进入专注状态'
        },
        {
          startTime: '19:10',
          endTime: '19:50',
          name: `${interestPrefix}主题探索`,
          type: 'main',
          description: `围绕${selectedTheme}展开的创意活动，融入孩子的兴趣点`,
          steps: [
            '介绍今天的主题和故事背景',
            '展示材料并讲解使用方法',
            '孩子自主创作，家长适时协助',
            '分享作品，讲述创作思路'
          ],
          materials: ['彩纸', '剪刀', '胶水', '彩笔', '废旧材料'],
          tips: '鼓励孩子发挥想象力，不要过多干预',
          educationalValue: '培养创造力、动手能力和表达能力'
        },
        {
          startTime: '19:50',
          endTime: '20:10',
          name: '整理与分享',
          type: 'transition',
          description: '一起收拾材料，分享今天的收获',
          steps: [
            '将材料分类归位',
            '孩子展示作品',
            '家长给予积极反馈',
            '准备水果点心'
          ],
          materials: ['收纳盒', '湿巾'],
          tips: '让孩子参与收拾，培养责任感',
          educationalValue: '培养整理习惯和分享意识'
        },
        {
          startTime: '20:10',
          endTime: '20:50',
          name: '绘本时间',
          type: 'quiet',
          description: '阅读与主题相关的绘本，延伸活动内容',
          steps: [
            '选择2-3本相关绘本',
            '家长朗读，孩子观察图画',
            '互动提问，讨论故事情节',
            '联系今天的活动经验'
          ],
          materials: ['主题绘本', '舒适的阅读角'],
          tips: '声音轻柔，营造温馨的阅读氛围',
          educationalValue: '培养阅读兴趣，拓展知识面'
        },
        {
          startTime: '20:50',
          endTime: '21:00',
          name: '睡前准备',
          type: 'bedtime',
          description: '固定的睡前仪式，帮助孩子进入睡眠状态',
          steps: [
            '刷牙洗脸',
            '换上睡衣',
            '拥抱晚安',
            '调暗灯光'
          ],
          materials: ['牙刷', '睡衣', '小夜灯'],
          tips: '保持固定的流程和时间，建立睡眠规律',
          educationalValue: '培养良好的生活习惯和时间观念'
        }
      ],
      materialsSummary: [
        '彩纸、剪刀、胶水、彩笔等手工材料',
        '主题相关绘本2-3本',
        '音乐播放设备',
        '水果点心',
        '洗漱用品'
      ],
      overallTips: `这是一个适合${childAge}岁孩子的${selectedTheme}主题晚间活动。活动设计动静交替，既有创意表达又有安静阅读，最后以固定的睡前仪式结束。家长可以根据孩子的实际状态灵活调整时间分配。`
    };
  }

  async optimizeTemplate(template, feedback) {
    // 模拟优化：在模板基础上添加优化标记
    return {
      ...template,
      optimized: true,
      optimizationNote: `根据反馈"${feedback}"进行了优化`,
      activities: template.activities.map((activity, index) => ({
        ...activity,
        tips: `${activity.tips}（已优化）`
      }))
    };
  }

  async generateActivityVariant(activity, constraints) {
    // 模拟生成变体
    return {
      ...activity,
      name: `${activity.name}（变体版）`,
      description: `${activity.description} - 根据约束条件调整`,
      variant: true,
      constraints: constraints
    };
  }
}

module.exports = MockAdapter;
