// Everyday vocabulary, deliberately stored without printed pinyin answers.
// Text is also its stable progress ID. Keep existing words when extending the bank.
export const wordGroups = [
  { category: '家人朋友', words: '爸爸 妈妈 爷爷 奶奶 外公 外婆 哥哥 姐姐 弟弟 妹妹 叔叔 阿姨 宝宝 孩子 家人 朋友 同学 老师 客人 邻居 男孩 女孩 大人 小孩' },
  { category: '身体健康', words: '头发 眼睛 耳朵 鼻子 嘴巴 牙齿 舌头 眉毛 脸蛋 手心 手指 指甲 手臂 肚子 后背 双腿 脚丫 脚趾 身体 皮肤 医生 护士 口罩 体温' },
  { category: '家中物品', words: '桌子 椅子 沙发 板凳 台灯 书架 衣柜 窗户 窗帘 房门 门铃 地板 墙壁 镜子 时钟 电话 电视 冰箱 风扇 空调 钥匙 水杯 茶壶 花瓶' },
  { category: '起居用品', words: '牙刷 牙膏 毛巾 脸盆 香皂 肥皂 浴巾 梳子 枕头 被子 床单 拖鞋 睡衣 纸巾 水桶 扫把 抹布 衣架 鞋架 雨伞 背包 手套 帽子 围巾' },
  { category: '饭菜点心', words: '米饭 面条 馒头 包子 饺子 面包 饼干 蛋糕 鸡蛋 牛奶 豆浆 稀饭 玉米 红薯 土豆 南瓜 豆腐 鱼肉 鸡肉 牛肉 排骨 汤圆 面粉 花生' },
  { category: '蔬菜水果', words: '苹果 香蕉 橘子 橙子 桃子 梨子 葡萄 西瓜 草莓 蓝莓 樱桃 菠萝 芒果 石榴 柚子 柠檬 白菜 青菜 菠菜 黄瓜 萝卜 蘑菇 冬瓜 番茄' },
  { category: '可爱动物', words: '小猫 小狗 兔子 老虎 狮子 大象 熊猫 猴子 松鼠 刺猬 斑马 长颈鹿 河马 骆驼 绵羊 山羊 水牛 小马 小猪 小鹿 小熊 狐狸 袋鼠 乌龟' },
  { category: '鸟虫水族', words: '小鸟 麻雀 燕子 喜鹊 乌鸦 鸽子 鹦鹉 孔雀 天鹅 公鸡 母鸡 鸭子 白鹅 蝴蝶 蜜蜂 蜻蜓 蚂蚁 蝉儿 蚯蚓 蜗牛 青蛙 金鱼 海豚 鲸鱼' },
  { category: '自然天气', words: '太阳 月亮 星星 天空 白云 乌云 彩虹 雨水 雪花 雷声 闪电 大风 微风 春风 阳光 空气 水滴 露珠 冰块 大海 河水 湖水 高山 石头' },
  { category: '花草四季', words: '小草 大树 树叶 树枝 树根 花朵 花瓣 花园 草地 森林 竹子 荷花 梅花 菊花 桃花 松树 柳树 种子 果实 春天 夏天 秋天 冬天 四季' },
  { category: '学校学习', words: '学校 教室 操场 黑板 书本 铅笔 蜡笔 彩笔 橡皮 尺子 书包 文具 课桌 画纸 图画 课本 故事 儿歌 音乐 汉字 拼音 数字 颜色 作业' },
  { category: '游戏运动', words: '玩具 积木 拼图 皮球 气球 风筝 滑梯 秋千 沙子 木马 娃娃 小鼓 铃铛 跳绳 篮球 足球 乒乓球 羽毛球 跑步 跳舞 唱歌 游泳 拍手 画画' },
  { category: '出门交通', words: '汽车 火车 飞机 轮船 自行车 摩托车 公交车 校车 地铁 卡车 车站 机场 码头 马路 人行道 斑马线 红绿灯 路口 桥梁 隧道 方向 前方 后方 远方' },
  { category: '社区生活', words: '公园 广场 超市 商店 菜场 医院 药店 邮局 银行 饭店 厨房 客厅 卧室 阳台 楼梯 电梯 房子 楼房 村庄 城市 农村 家乡 动物园 图书馆' },
  { category: '日常动作', words: '起床 穿衣 刷牙 洗脸 洗手 吃饭 喝水 睡觉 散步 开门 关门 回家 出门 上学 放学 读书 写字 听话 说话 微笑 点头 摇头 招手 拥抱' },
  { category: '礼貌心情', words: '你好 再见 谢谢 请问 对不起 没关系 不客气 欢迎 早安 晚安 开心 快乐 高兴 难过 害怕 勇敢 认真 安静 热闹 干净 整齐 漂亮 可爱 温暖' },
  { category: '时间方位', words: '今天 明天 昨天 早晨 中午 下午 晚上 白天 夜晚 时间 小时 分钟 星期 周末 生日 节日 新年 上面 下面 左边 右边 里面 外面 中间' },
  { category: '观察比较', words: '红色 黄色 蓝色 绿色 白色 黑色 紫色 圆形 方形 三角形 大小 多少 高低 长短 粗细 轻重 冷热 快慢 远近 新旧 香甜 柔软 明亮 宽敞' },
] as const;

export type CommonWord = { text: string; category: string };
const groups = wordGroups.map(({ category, words }) => words.split(' ').map((text) => ({ text, category })));
// Interleave topics so each printout contains a variety of familiar situations.
export const commonWords: CommonWord[] = Array.from({ length: Math.max(...groups.map((group) => group.length)) }, (_, index) =>
  groups.flatMap((group) => group[index] ? [group[index]] : []),
).flat();

export type WordProgress = { version: 1; cycle: number; completed: string[] };
export type WordPractice = CommonWord & { cycle: number; position: number };
export const initialWordProgress = (): WordProgress => ({ version: 1, cycle: 1, completed: [] });

export function takeNextWords(progress: WordProgress, count: number): { words: WordPractice[]; next: WordProgress } {
  if (!Number.isInteger(count) || count < 0 || count > commonWords.length) throw new Error('Invalid word count');
  const words: WordPractice[] = [];
  let cycle = progress.cycle;
  let completed = new Set(progress.completed);
  for (let index = 0; index < count; index += 1) {
    if (completed.size === commonWords.length) { cycle += 1; completed = new Set(); }
    const word = commonWords.find(({ text }) => !completed.has(text));
    if (!word) throw new Error('Invalid word progress');
    words.push({ ...word, cycle, position: completed.size + 1 });
    completed.add(word.text);
  }
  return { words, next: { version: 1, cycle, completed: [...completed] } };
}
