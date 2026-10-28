import {GameEngine} from '../../frontend/src/features/richman/game/engine';
import {STOCK_MARKET_FINGERPRINT} from '../../frontend/src/features/richman/game/stock-market-rules';
import nodes from '../../shared/richman/japan-topology.fixture.json';
for(const v of[40,41,42,43]){const e=new GameEngine(nodes,{gameId:'check',seed:'check',rulesId:`japan-events-candidate-v${v}`,characterIds:['a','b'],initialFunds:100000});console.log(v,e.state.items?.fingerprint,!!e.state.siteServices,!!e.state.g6?.market);}
console.log(STOCK_MARKET_FINGERPRINT);
