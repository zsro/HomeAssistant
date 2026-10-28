import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {DividendPanel} from './DividendPanel';
import {GameSession} from './game/session';
import type {Manifest} from './types';
import nodes from '../../../../shared/richman/japan-topology.fixture.json';
afterEach(cleanup);
const manifest:Manifest={version:1,map:{name:'日本',width:2304,height:2304,nodes,scenery:[]},sprites:{},characters:['a','b','c','d'].map(id=>({id,name:id,color:'#fff',idle:[],walk:[],walkFramesPerDirection:10}))};
function snapshot(){const session=new GameSession(manifest,{id:()=> 'dividend-ui',seed:()=> 'dividend-ui'},'dividends');session.start({mode:'dividends',characterIds:['b','d'],seed:'dividend-ui',startDate:'1998-01-14'});return session.snapshot();}
it('new mode includes inherited lottery/date and initially empty company ledger',()=>{const s=snapshot();expect(s.mode).toBe('dividends');expect(s.lottery).toBeDefined();expect(s.calendar!.date).toBe('1998-01-14');render(<DividendPanel snapshot={s}/>);expect(screen.getByText('尚未发生日期分红。')).toBeInTheDocument();expect(screen.getByText(/三越百貨：本期 0 元/)).toBeInTheDocument();});
it('shows carry, per-company allocations and negative cash/bank settlement by seat, no repeat claim',()=>{const s=snapshot();s.news!.business!.dividends={date:'1998-01-15',companies:[{companyId:'c',stockId:'jp:26',name:'三越百貨',funds:-1000,cumulative:-1000,shares:0,after:-1000,allocations:[]}],payments:[{playerId:'player-2',amount:-1000,before:{cash:100,bank:10},after:{cash:0,bank:0},unpaid:890,bankrupt:true,returnedShares:1}]};render(<DividendPanel snapshot={s}/>);expect(screen.getByLabelText('最近公司分红')).toHaveTextContent('无人持股，结转');expect(screen.getByLabelText('最近公司分红')).toHaveTextContent('玩家 2：合计 -1,000 元');expect(screen.getByLabelText('最近公司分红')).toHaveTextContent('不足 890 元，破产退出');expect(screen.queryAllByRole('button')).toHaveLength(0);});
it('legacy business without dividends does not display future semantics',()=>{const s=snapshot();delete s.news!.business!.dividends;const{container}=render(<DividendPanel snapshot={s}/>);expect(container).toBeEmptyDOMElement();});
