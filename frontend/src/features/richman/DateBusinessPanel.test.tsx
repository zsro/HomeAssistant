import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {PropertyPanel} from './PropertyPanel';
import {CalendarPanel} from './CalendarPanel';
import {InsurancePanel} from './InsurancePanel';
import {GameSession} from './game/session';
import type {Manifest} from './types';
import nodes from './japan-topology.fixture.json';
afterEach(cleanup);
const manifest:Manifest={version:1,map:{name:'日本',width:2304,height:2304,nodes,scenery:[]},sprites:{},characters:['a','b'].map(id=>({id,name:id,color:'#fff',idle:[],walk:[],walkFramesPerDirection:10}))};
function fixture(){const session=new GameSession(manifest,{id:()=> 'date-ui',seed:()=> 'date-ui'},'dateBusiness');session.start({mode:'dateBusiness',characterIds:['a','b'],seed:'date-ui',startDate:'1998-12-24'});return{session,snapshot:session.snapshot()};}
it('v30 mode retains date on restart and shows index and its bounded fee scope',()=>{const{session,snapshot}=fixture();render(<CalendarPanel snapshot={snapshot}/>);expect(screen.getByRole('heading',{name:'物价指数 · 1 倍'})).toBeInTheDocument();expect(screen.getByText(/其他费用仍沿用既有候选规则/)).toBeInTheDocument();expect(session.exportReplay()!.rulesId).toBe('japan-events-candidate-v30');expect(session.exportReplay()!.config.startDate).toBe('1998-12-24');});
it('holiday receipt identifies each gift/replacement/empty pool and premium shows current index',()=>{const{snapshot}=fixture();const b=snapshot.calendar!.business!;b.priceIndex=3;b.festival={date:'1998-12-25',slot:18,name:'圣诞节',flags:15,gifts:[{playerId:'player-1',itemId:'card:03',discarded:'card:01'},{playerId:'player-2',itemId:null,discarded:null}]};render(<><CalendarPanel snapshot={snapshot}/><InsurancePanel snapshot={snapshot} spin={()=>{}}/></>);expect(screen.getByText(/获得 购地卡，替换 均富卡/)).toBeInTheDocument();expect(screen.getByText(/卡池已空，未获得卡片/)).toBeInTheDocument();expect(screen.getByText(/每次期限 3,000 元/)).toBeInTheDocument();});
it('New Year presentation explicitly has no extra reward',()=>{const{snapshot}=fixture();snapshot.calendar!.business!.festival={date:'1999-01-01',slot:0,name:'元旦',flags:3,gifts:[]};render(<CalendarPanel snapshot={snapshot}/>);expect(screen.getByText('元旦日期提示；无额外现金或卡片奖励。')).toBeInTheDocument();});

it('v31 session exposes indexed property scope and keeps raw asset labels separate',()=>{const session=new GameSession(manifest,{id:()=> 'indexed-ui',seed:()=> 'indexed-ui'},'indexedEconomy');session.start({mode:'indexedEconomy',characterIds:['a','b'],seed:'indexed-ui',startDate:'1998-12-24'});const snapshot=session.snapshot();snapshot.calendar!.business!.priceIndex=3;render(<><CalendarPanel snapshot={snapshot}/><PropertyPanel snapshot={snapshot} manifest={manifest} decide={()=>{}}/></>);expect(session.exportReplay()!.rulesId).toBe('japan-events-candidate-v31');expect(screen.getByText('候选规则 · 物价 ×3')).toBeInTheDocument();expect(screen.getByText(/地产购买.*地价原值和持股价值不额外乘/)).toBeInTheDocument();});
