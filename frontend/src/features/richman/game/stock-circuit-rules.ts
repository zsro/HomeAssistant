import {STOCK_LEDGER_FINGERPRINT} from './stock-ledger-rules';
import {hashSeed} from './random';
export const STOCK_CIRCUIT_RULES=Object.freeze({id:'japan-events-candidate-v44',base:'japan-events-candidate-v43',companyTrend:'news30..35-with-nonzero-trend-synchronizes-persistent-percent+-10-before-immediate-requote;zero-trend-preserves-percent;native0044b402/0044b6d6-to00429040',scope:'inherit-v43-ledger-v42-quotes-and-all-prior-semantics;no-chart-or-native-precision-RNG-equivalence'});
export const STOCK_CIRCUIT_FINGERPRINT=hashSeed(JSON.stringify({base:STOCK_LEDGER_FINGERPRINT,rules:STOCK_CIRCUIT_RULES})).toString(16);
