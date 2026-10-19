/** UI-06: real surrender/replay, plus isolated event fixtures using the actual modal host. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const base=process.env.RICHMAN_TEST_BASE_URL||'http://127.0.0.1:5174',output=process.env.RICHMAN_TEST_OUTPUT||'/private/tmp/richman-ui06',built=process.env.RICHMAN_BUILT_SMOKE==='1';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local validation only');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1440,height:1080}}),errors=[];
 const user={id:'richman-validation',username:'validation',displayName:'技术验证',inviteCode:'VALIDATION',invitedByUserId:null,status:'active',createdAt:'2026-10-19T00:00:00.000Z'};
 await context.route(base+'/api/**',route=>route.fulfill(route.request().url().endsWith('/users/me')?{json:{success:true,data:{user}}}:{status:404,json:{success:false}}));
 await context.addInitScript(user=>localStorage.setItem('home-assistant.session.v1',JSON.stringify({user,tokens:{accessToken:'browser-test-only',refreshToken:'browser-test-only',tokenType:'Bearer',accessExpiresIn:3600,refreshExpiresIn:7200},accessExpiresAt:Date.now()+3600000,refreshExpiresAt:Date.now()+7200000})),user);
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 const capture=async name=>{await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.screenshot({path:output+'/'+name+'.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);};
 try{
 await page.goto(base+'/modules/richman');await page.locator('.rm-system-dialog').getByRole('button',{name:'继续当前对局'}).click();await page.getByRole('button',{name:'掷骰出发',exact:true}).waitFor();
 await page.locator('.rm-game-toolbar').getByRole('button',{name:'新建对局',exact:true}).click();const setup=page.getByRole('dialog',{name:'开启一场新旅程'});
 await setup.getByText('高级设置 · 历史模式、电脑策略与种子',{exact:true}).click();await setup.getByLabel(/游戏模式/).selectOption('surrender');await setup.getByLabel(/对局种子/).fill('ui06-events');
 for(const name of ['孙小美','阿土伯','钱夫人','沙隆巴斯'])await setup.getByRole('checkbox',{name,exact:true}).setChecked(true);
 await setup.getByRole('button',{name:'开始新对局'}).click();const host=page.locator('[data-window-host]');
 await page.getByRole('button',{name:'更多功能',exact:true}).click();await host.getByRole('button',{name:'认输与衰神',exact:true}).click();
 const initialRevision=await page.getByTestId('richman-viewport').getAttribute('data-revision');
 await host.getByRole('button',{name:'认输退出本局',exact:true}).click();await capture('surrender-confirm-desktop');
 await host.getByRole('button',{name:'继续对局',exact:true}).click();assert.equal(await page.getByTestId('richman-viewport').getAttribute('data-revision'),initialRevision);
 await host.getByRole('button',{name:'认输退出本局',exact:true}).click();await host.getByRole('button',{name:'确认认输',exact:true}).dblclick();
 await host.getByRole('heading',{name:'认输已完成'}).waitFor();assert.equal(await host.getByRole('button',{name:'关闭窗口'}).isDisabled(),true);
 await page.keyboard.press('Escape');assert.equal(await host.isVisible(),true);await capture('surrender-target-desktop');
 await page.setViewportSize({width:390,height:844});await capture('surrender-target-mobile');await host.getByRole('button',{name:'衰神附身玩家 2'}).click();
 await page.getByRole('button',{name:'下一位',exact:true}).waitFor();await page.setViewportSize({width:1440,height:1080});
 await page.getByRole('button',{name:'更多功能',exact:true}).click();await host.getByRole('button',{name:'运行信息与验证工具',exact:true}).click();
 const download=page.waitForEvent('download');await host.getByRole('button',{name:'下载回放记录'}).click();await(await download).saveAs(output+'/replay.json');
 const replay=JSON.parse(fs.readFileSync(output+'/replay.json','utf8'));assert.equal(replay.commands.filter(c=>c.action.type==='surrender').length,1);assert.equal(replay.commands.filter(c=>c.action.type==='chooseDeath').length,1);
 await host.getByRole('button',{name:'关闭窗口'}).click();await page.getByRole('button',{name:'更多功能',exact:true}).click();await host.getByRole('button',{name:'资产处置记录',exact:true}).click();
 assert.match(await host.getByLabel('破产处置回执').innerText(),/主动认输/);await capture('disposal-desktop');await page.setViewportSize({width:390,height:844});await capture('disposal-mobile');await page.setViewportSize({width:1440,height:1080});
 let replayVerified=false;
 if(!built){
 const final=await page.evaluate(async replay=>{const{replayGame}=await import('/src/features/richman/game/engine.ts');const m=await(await fetch('/richman/generated/manifest.json')).json();const e=replayGame(m.map.nodes,replay);return{phase:e.state.phase,eliminated:e.state.finance.eliminated,completed:e.events.filter(x=>x.type==='surrenderCompleted').length};},replay);
 assert.deepEqual(final,{phase:'turnEnd',eliminated:['player-1'],completed:1});replayVerified=true;
 await page.evaluate(async()=>{
 const React=(await import('/node_modules/.vite/deps/react.js')).default,{createRoot}=(await import('/node_modules/.vite/deps/react-dom_client.js')).default;
 const {GameSession}=await import('/src/features/richman/game/session.ts');const manifest=await(await fetch('/richman/generated/manifest.json')).json();
 const session=new GameSession(manifest,{id:()=> 'ui06-fixture',seed:()=> 'ui06-fixture'},'surrender');session.start({mode:'surrender',seed:'ui06-fixture',characterIds:manifest.characters.slice(0,3).map(c=>c.id)});
 const modules={};for(const name of ['GameWindowHost','NewsPanel','FortunePanel','MagicPanel','G3Choice','G4Choice','FinancePanel','DisposalPanel','MinigamePanel'])Object.assign(modules,await import('/src/features/richman/'+name+'.tsx'));
 const {preventRepeatedClick,preventRepeatedKey}=await import('/src/features/richman/window-input.ts');
 const element=document.createElement('div');document.body.append(element);const root=createRoot(element);document.getElementById('root').style.display='none';
 const h=React.createElement;let revision=0;
 function Harness({snapshot,panel,children}){const ref=React.useRef(null);return h('main',{ref,className:'rm-page rm-classic-page',onClickCapture:preventRepeatedClick,onKeyDownCapture:preventRepeatedKey},h('p',null,'UI-06 独立展示测试；此区域不连接运行中的对局'),h(modules.GameWindowHost,{root:ref,snapshot,isCurrent:()=>snapshot.revision===revision,suspended:false,epoch:0,onPause:()=>{},onNewGame:()=>{}},h(modules.WindowPanel,{id:panel},children)));}
 window.ui06={calls:[],render:(kind,options={})=>{
  const s=structuredClone(session.snapshot());s.revision=++revision;s.paused=!!options.paused;const call=(...a)=>{window.ui06.calls.push([kind,...a]);return true};let Component,props={},panel=kind;
  if(kind==='news'){s.phase='news';s.newsDecision={kind:'news',id:'news',node:14,newsId:7,title:'公开拍卖地产',lines:['公开拍卖大阪空地。'],auction:{propertyId:s.economy.properties[0].id,reserve:500}};Component=modules.NewsPanel;props={decision:s.newsDecision,paused:s.paused,acknowledge:call};}
  if(kind==='fortune'){s.phase='fortune';s.fortuneDecision={kind:'fortune',id:'fortune',node:19,fortuneId:5,title:'向其他玩家取卡',lines:['逐人选择一张卡片。'],collection:{donors:['player-2','player-3'],index:options.donor??0,items:['card:14','card:18'],skipped:[],change:{}}};Component=modules.FortunePanel;props={decision:s.fortuneDecision,paused:s.paused,acknowledge:call,collect:call};}
  if(kind==='magic'){s.phase='magic';s.magicDecision={kind:'magic',id:'magic',node:35,stage:options.stage??'choose',targets:['player-2','player-3'],group:6,extended:true,nestedEnabled:true,responderId:'player-2',receipt:{title:'存入所有现金',rows:[{playerId:'player-2',lines:['现金 100 → 0；存款 0 → 100 元。']}]}};Component=modules.MagicPanel;props={decision:s.magicDecision,paused:s.paused,act:call,build:call};}
  if(kind==='auction'){s.phase='auction';s.auction={kind:'auction',id:'auction',propertyId:s.economy.properties[0].id,sourceId:'player-1',originalOwner:null,reserve:500,bid:500,leader:null,responderId:options.responder??'player-2',remaining:['player-2','player-3']};s.economy.balances[s.auction.responderId].cash=1000;Component=modules.AuctionPanel;props={snapshot:s,bid:call};}
  if(kind==='reaction'){s.phase='reaction';s.reaction={kind:'reaction',id:'reaction',responderId:options.responder??'player-2',stage:'redirect',targets:['player-1'],continuation:{kind:'magicDetention',detention:'prison',sourceId:'player-1',originalId:'player-2',cursor:0,total:2}};Component=modules.ReactionPanel;props={snapshot:s,respond:call};}
  if(kind==='finance'){s.phase='debt';s.economy.balances['player-2']={cash:100,bank:200};s.debtDecision={kind:'debt',id:'debt',payerId:'player-2',recipientId:'player-1',amount:1000,available:300,shortfall:700,lines:[]};Component=modules.FinancePanel;props={snapshot:s,manifest,transfer:call,leaveBank:call,settleDebt:call,newGame:call};}
  if(kind==='minigame'){s.phase='minigame';s.minigame={kind:'minigame',id:'mini',node:24,game:'balloon',stage:options.stage??'ready',tick:0,remaining:150,score:options.stage==='result'?12:0,reason:options.stage==='result'?'quit':null,freeze:0,speed:0,balloons:[{x:320,y:200,type:1,burst:0}]};Component=modules.MinigamePanel;props={decision:s.minigame,paused:s.paused,act:call};}
  let child=h(Component,props);
  if(options.nested){const batch={id:'batch',sourceId:'player-1',sourceIndex:0,cursor:0,calls:2,waiting:'fortune',receipt:{title:'接连三次命运',targets:['player-2','player-3']}};child=h(React.Fragment,null,h(modules.MagicNestedPanel,{batch}),child);}
  root.render(h(Harness,{snapshot:s,panel},child));
 }};
 });
 const fixtureHost=page.locator('[data-window-host]').filter({visible:true});
 const renderFixture=async(kind,options={})=>{await page.evaluate(({kind,options})=>window.ui06.render(kind,options),{kind,options});await fixtureHost.locator(`[data-richman-panel="${kind}"]`).waitFor();await page.waitForTimeout(50);};
 for(const kind of ['news','fortune','magic','auction','reaction','finance','minigame']){
  await renderFixture(kind,{nested:kind==='reaction'});await page.keyboard.press('Escape');assert.equal(await fixtureHost.isVisible(),true);
  await capture(kind+'-desktop');await page.setViewportSize({width:390,height:844});await capture(kind+'-mobile');
  if(kind==='news')await fixtureHost.getByRole('button',{name:'进入竞价'}).dblclick();
  if(kind==='fortune'){await fixtureHost.getByLabel('命运选取卡片').selectOption('card:14');await renderFixture(kind,{donor:1});assert.equal(await fixtureHost.getByLabel('命运选取卡片').inputValue(),'');assert.equal(await fixtureHost.getByRole('button',{name:'确认取卡'}).isDisabled(),true);await fixtureHost.getByLabel('命运选取卡片').selectOption('card:18');await fixtureHost.getByRole('button',{name:'确认取卡'}).click();}
  if(kind==='magic'){await fixtureHost.getByRole('button',{name:'接连三次命运',exact:true}).click();await renderFixture(kind,{stage:'build'});await fixtureHost.getByRole('button',{name:'研究所',exact:true}).click();await renderFixture(kind,{stage:'result'});await capture('magic-result-mobile');await fixtureHost.getByRole('button',{name:'继续回合'}).click();}
  if(kind==='auction'){assert.equal(await fixtureHost.getByRole('button',{name:'加价 1,000'}).isDisabled(),true);await fixtureHost.getByRole('button',{name:'加价 500'}).click();await renderFixture(kind,{responder:'player-3'});assert.match(await fixtureHost.innerText(),/请玩家 3 竞价/);await fixtureHost.getByRole('button',{name:'退出竞价'}).click();}
  if(kind==='reaction'){await fixtureHost.getByLabel('嫁祸目标').selectOption('player-1');await renderFixture(kind,{responder:'player-3',nested:true});assert.equal(await fixtureHost.getByLabel('嫁祸目标').inputValue(),'');await fixtureHost.getByRole('button',{name:'不使用嫁祸卡'}).click();}
  if(kind==='finance')await fixtureHost.getByRole('button',{name:'确认支付现有资金并破产'}).dblclick();
  if(kind==='minigame'){await fixtureHost.getByRole('button',{name:'开始射气球'}).click();await renderFixture(kind,{stage:'playing'});const svg=fixtureHost.getByRole('group',{name:'小游戏操作区'});const box=await svg.boundingBox();await svg.click({position:{x:box.width*.5,y:box.height*200/420}});await renderFixture(kind,{stage:'playing',paused:true});assert.equal(await fixtureHost.getByRole('button',{name:'退出小游戏，保留已得分'}).isDisabled(),true);await renderFixture(kind,{stage:'result'});await capture('minigame-result-mobile');await fixtureHost.getByRole('button',{name:'结算点数并返回'}).click();}
  await page.setViewportSize({width:1440,height:1080});
 }
 const calls=await page.evaluate(()=>window.ui06.calls);assert.equal(calls.filter(c=>c[0]==='news').length,1);assert.equal(calls.filter(c=>c[0]==='finance').length,1);assert.ok(calls.some(c=>c[0]==='minigame'&&c[1].kind==='point'&&Math.abs(c[1].x-320)<8&&Math.abs(c[1].y-200)<8));fs.writeFileSync(output+'/fixture-calls.json',JSON.stringify(calls,null,2));
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(output+'/results.json',JSON.stringify({realRoute:['cancel surrender without mutation','double-click surrender only once','mandatory target selection','mobile target choice','replay command counts','actual surrender disposal receipt'],replayVerified,fixtures:built?[]:['news','fortune donor handoff','magic choose/build/result','auction responder cash','nested reaction handoff','debt single confirmation','minigame scaled input/pause/result'],errors},null,2));console.log('UI-06 browser checks passed');
 }catch(e){await page.screenshot({path:output+'/failure.png',fullPage:true});throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
