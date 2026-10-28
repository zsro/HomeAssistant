/** Facts transcribed from fixed reference tables; no runtime source/assets copied. */
export const G6_GOODS = [
  { id: 'card:22', name: '送神符', price: 10, supply: 3, effect: 'card:22:dismiss-v1', target: 'self' },
  { id: 'card:23', name: '请神符', price: 20, supply: 3, effect: 'card:23:invite-v1', target: 'god' },
  { id: 'card:24', name: '红卡', price: 50, supply: 3, effect: 'card:24:red-v1', target: 'stock' },
  { id: 'card:25', name: '黑卡', price: 30, supply: 3, effect: 'card:25:black-v1', target: 'stock' },
] as const;
export const GODS = [
  { type: 1, name: '小财神', detail: '附身收取其他玩家现金；普通租金减半。', bad: false },
  { type: 2, name: '大财神', detail: '附身获得现金；普通租金免付。', bad: false },
  { type: 3, name: '小福神', detail: '附身获得1张供应池内的随机卡片。', bad: false },
  { type: 4, name: '大福神', detail: '附身获得2张供应池内的随机卡片。', bad: false },
  { type: 5, name: '小穷神', detail: '附身向其他玩家付款；普通租金增加一半。', bad: true },
  { type: 6, name: '大穷神', detail: '附身扣款；普通租金加倍。', bad: true },
  { type: 7, name: '小衰神', detail: '附身随机丢弃1张卡片。', bad: true },
  { type: 8, name: '大衰神', detail: '附身随机丢弃一半卡片（向下取整）。', bad: true },
  { type: 9, name: '天使', detail: '落点结算后脚下建筑升1级；空大型地默认饭店。', bad: false },
  { type: 10, name: '恶魔', detail: '落点结算后脚下建筑降1级，产权保留。', bad: true },
  { type: 12, name: '土地公', detail: '停在地产时免费取得产权，建筑保留。', bad: false },
  { type: 15, name: '衰神', detail: '附身清空背包；附身期间不能收租，期限13次。', bad: true },
] as const;
export const JAPAN_STOCKS = [
  { id: 'jp:24', name: '富士银行', shares: 10000, price: 16000, volatility: 8 },
  { id: 'jp:25', name: '三井生命', shares: 5000, price: 9900, volatility: 14 },
  { id: 'jp:26', name: '三越百货', shares: 10000, price: 2200, volatility: 20 },
  { id: 'jp:27', name: '日产建设', shares: 5000, price: 2800, volatility: 20 },
  { id: 'jp:28', name: 'SEGA', shares: 5000, price: 30000, volatility: 10 },
  { id: 'jp:29', name: '丰田汽车', shares: 5000, price: 3500, volatility: 12 },
  { id: 'jp:30', name: '松下电机', shares: 10000, price: 54000, volatility: 10 },
  { id: 'jp:31', name: '日立机电', shares: 10000, price: 83000, volatility: 10 },
  { id: 'jp:32', name: 'SONY', shares: 10000, price: 30000, volatility: 12 },
  { id: 'jp:33', name: '三菱工业', shares: 10000, price: 22500, volatility: 7 },
  { id: 'jp:34', name: '任天堂', shares: 10000, price: 30000, volatility: 10 },
  { id: 'jp:35', name: '德间书店', shares: 10000, price: 15000, volatility: 8 },
] as const;
