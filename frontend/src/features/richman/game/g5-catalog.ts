/** Fixed reference tables; research tools deliberately excluded from the shop. */
export const G5_GOODS = [
  { id: 'card:09', name: '天使卡', price: 160, supply: 2, effect: 'card:09:angel-v1', target: 'property', shop: true },
  { id: 'card:10', name: '恶魔卡', price: 180, supply: 1, effect: 'card:10:devil-v1', target: 'property', shop: true },
  { id: 'card:11', name: '怪兽卡', price: 60, supply: 2, effect: 'card:11:monster-v1', target: 'property', shop: true },
  { id: 'tool:03', name: '地雷', price: 25, supply: 10, effect: 'tool:03:mine-v1', target: 'node', shop: true },
  { id: 'tool:04', name: '定时炸弹', price: 25, supply: 10, effect: 'tool:04:bomb-v1', target: 'node', shop: true },
  { id: 'tool:07', name: '飞弹', price: 100, supply: 10, effect: 'tool:07:missile-v1', target: 'node', shop: true },
  { id: 'tool:12', name: '工程车', price: 150, supply: 0, effect: 'tool:12:engineer-v1', target: 'self', shop: false },
] as const;
export const RESEARCH_PRODUCTS = [{ id: 'tool:09', name: '机器工人', level: 1 }, { id: 'tool:12', name: '工程车', level: 4 }] as const;
