/** G4 table values from the fixed reference card table; separate to avoid registry cycles. */
export const G4_GOODS = [
  { id: 'card:07', name: '改建卡', price: 15, supply: 8, effect: 'card:07:remodel-v1', target: 'property' },
  { id: 'card:08', name: '拍卖卡', price: 20, supply: 3, effect: 'card:08:auction-v1', target: 'property' },
  { id: 'card:26', name: '查税卡', price: 35, supply: 4, effect: 'card:26:tax-v1', target: 'otherPlayer' },
  { id: 'card:27', name: '涨价卡', price: 35, supply: 3, effect: 'card:27:price-v1', target: 'property' },
  { id: 'card:28', name: '查封卡', price: 35, supply: 3, effect: 'card:28:seal-v1', target: 'property' },
] as const;
export const FACILITY_TYPES = ['公园', '大饭店', '购物中心', '加油站', '研究所'] as const;
