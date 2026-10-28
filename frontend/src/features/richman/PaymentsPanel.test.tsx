import {afterEach,expect,it} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {GameSession} from './game/session';
import {DisposalPanel} from './DisposalPanel';
import {EstateSalesPanel} from './EstateSalesPanel';
import {CalendarPanel} from './CalendarPanel';
import type {Manifest} from './types';
import nodes from '../../../../shared/richman/japan-topology.fixture.json';
afterEach(cleanup);
function snapshot(){const m:Manifest={version:1,map:{name:'日本',width:2304,height:2304,nodes,scenery:[]},sprites:{},characters:['孙小美','阿土伯','钱夫人'].map((name,i)=>({id:String(i),name,color:'#fff',idle:[],walk:[],walkFramesPerDirection:10}))};return new GameSession(m,{id:()=> 'payments-ui',seed:()=> 'payments-ui'},'payments').snapshot();}
it('v34 session selects correct profile and accurately separates batch callbacks still pending',()=>{const s=snapshot();expect(s.finance!.payments).toEqual({current:null,last:null});render(<DisposalPanel snapshot={s}/>);expect(screen.getByRole('region',{name:'破产资产处置'})).toBeInTheDocument();expect(screen.getByText(/新闻税和负分红的多人结算仍待接入/)).toBeInTheDocument();expect(screen.getByText('尚未发生破产处置。')).toBeInTheDocument();});
it('public callback recipient is displayed as public fund, never as an undefined player',()=>{const s=snapshot();s.finance!.disposal!.last={continuation:'payment',id:'d',payerId:'player-1',recipientId:'public',propertyId:'fortune:23',due:1000,paid:{cash:2,bank:3},amount:5,unpaid:995,released:[],pool:[],draws:[],stocks:[],inventory:[],ignoredPoints:0,auctions:[],finishedGame:false};render(<DisposalPanel snapshot={s}/>);expect(screen.getByLabelText('破产处置回执')).toHaveTextContent('公共资金');expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();});
it('shared calendar and listing panels explain v34 scope without claiming migrated batches',()=>{render(<><EstateSalesPanel snapshot={snapshot()} act={()=>true}/><CalendarPanel snapshot={snapshot()}/></>);expect(screen.getAllByText(/多人新闻税和负分红处置不在此历史模式内/)).toHaveLength(2);});
