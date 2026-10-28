import { STOCK_MARKET_FINGERPRINT } from './stock-market-rules';
import { hashSeed } from './random';

export const STOCK_LEDGER_RULES = Object.freeze({
  id: 'japan-events-candidate-v43', base: 'japan-events-candidate-v42',
  average: 'float32-yuan;buy=f32((trunc(old-quantity*old-average)+actual-paid)/new-quantity);public-and-cash-subscription-share-rule',
  sell: 'partial-sale-keeps-average;empty-resets-zero;cost-is-derived-trunc(remaining-quantity*average);forced-sale-same-cost-rule',
  destinations: 'market-buy-bank;subscription-cash-and-separate-pool;manual-and-fortune9-sell-bank;fortune8-and-exit-disposal-public;no-company-revenue;no-revival-or-debt-credit-from-public-proceeds',
  display: 'average-two-decimals;cost-derived-not-historical-cash-outlay;value-existing-integer-cent-trunc;unrealized=value-minus-cost-Web-derived-not-realized',
  scope: 'reuse-v42-price-RNG-timing-gates;v43-inherits-asset-fortune-eligibility-and-card-collection-omitted-by-v42;retain-integer-cent-trade-amount-vs-native-float-price-boundary;no-x87-aggregate-bitwise-equivalence;G7-world-restores-average;legacy-no-new-field',
});
export const STOCK_LEDGER_FINGERPRINT = hashSeed(JSON.stringify({ base: STOCK_MARKET_FINGERPRINT, rules: STOCK_LEDGER_RULES })).toString(16);
