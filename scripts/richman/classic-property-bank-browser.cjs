/** UI-04 real Japan-map flow. Auth is isolated; only the animation tick is accelerated. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const base = process.env.RICHMAN_TEST_BASE_URL || 'http://127.0.0.1:5174';
const output = process.env.RICHMAN_TEST_OUTPUT || '/private/tmp/richman-ui04-business';
const built = process.env.RICHMAN_BUILT_SMOKE === '1';
if (!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local validation only');
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1440,height:1080}});
 const user={id:'richman-validation',username:'validation',displayName:'技术验证',inviteCode:'VALIDATION',invitedByUserId:null,status:'active',createdAt:'2026-10-18T00:00:00.000Z'};
 await context.route(base+'/api/**',route=>route.fulfill(route.request().url().endsWith('/users/me')?{json:{success:true,data:{user}}}:{status:404,json:{success:false}}));
 await context.addInitScript(({user})=>{
  localStorage.setItem('home-assistant.session.v1',JSON.stringify({user,tokens:{accessToken:'browser-test-only',refreshToken:'browser-test-only',tokenType:'Bearer',accessExpiresIn:3600,refreshExpiresIn:7200},accessExpiresAt:Date.now()+3600000,refreshExpiresAt:Date.now()+7200000}));
 },{user});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 try {
 await page.goto(base);
 if(!built) await page.evaluate(async()=>{
  const source=await(await fetch('/src/features/richman/scene.ts')).text();
  const specifier=source.match(/from ["']([^"']+\/session\.ts[^"']*)["']/)?.[1];
  if(!specifier)throw Error('Vite session import missing');
  const {GameSession}=await import(specifier),tick=GameSession.prototype.tick;
  GameSession.prototype.tick=function(ms){for(let i=0;i<500;i++){tick.call(this,ms>0?50:ms);if(this.state.paused||!['rolling','moving'].includes(this.state.phase))break;}};
 });
 let plan=built ? JSON.parse(fs.readFileSync(process.env.RICHMAN_UI04_PLAN || '/private/tmp/richman-ui04-business/plan.json','utf8')) : await page.evaluate(async()=>{
  const {GameEngine}=await import('/src/features/richman/game/engine.ts');
  const {FINANCE_RULES}=await import('/src/features/richman/game/finance.ts');
  const manifest=await(await fetch('/richman/generated/manifest.json')).json();
  let best=null;
  for(let seed=0;seed<30;seed++){
   const config={gameId:'ui04-plan',seed:'ui04-'+seed,characterIds:[manifest.characters[0].id,manifest.characters[2].id],initialFunds:50000,rulesId:FINANCE_RULES.id};
   const e=new GameEngine(manifest.map.nodes,config),steps=[],seen=new Set();let firstBankFinal=null;
   const send=action=>{const s=e.state;if(action.type!=='animationDone')steps.push({action,phase:s.phase,operation:s.pending?.operation,revision:s.revision});const r=e.dispatch({id:'c'+s.revision,gameId:s.gameId,expectedRevision:s.revision,playerId:s.players[s.active].id,action});if(!r.ok)throw Error(r.reason);};
   for(let n=0;n<3000&&e.state.turn<100&&seen.size<4;n++){
    const s=e.state,p=s.pending;
    if(s.phase==='idle')send({type:'roll'});
    else if(s.phase==='turnEnd')send({type:'endTurn'});
    else if(p?.kind==='property'){seen.add(p.operation);send({type:'property',decisionId:p.id,accept:p.operation==='rent'||s.economy.balances[s.players[s.active].id].cash>=p.amount});}
    else if(p?.kind==='branch')send({type:'choose',decisionId:p.id,node:p.choices[(s.turn-1)%p.choices.length]});
    else if(p?.kind==='bank'){
     if(!seen.has('bank')){
      send({type:'bank',decisionId:p.id,operation:'withdraw',amount:110});
      send({type:'bank',decisionId:e.state.pending.id,operation:'deposit',amount:110});seen.add('bank');
     }
     send({type:'leaveBank',decisionId:e.state.pending.id});if(!firstBankFinal)firstBankFinal=e.state;
    } else if(p?.kind==='debt'||s.phase==='finished')break;
    else send({type:'animationDone',token:p.id});
   }
   if(seen.size===4&&(!best||steps.length<best.steps.length))best={config,steps,final:e.state,firstBankFinal,seen:[...seen]};
  }
  if(!best)throw Error('No complete buy/upgrade/rent/bank route');return best;
 });
 if(!built)fs.writeFileSync(output+'/plan.json',JSON.stringify(plan));
 else plan={...plan,steps:plan.steps.slice(0,plan.steps.findIndex(s=>s.action.type==='leaveBank')+1),final:plan.firstBankFinal};
 console.log(`UI-04 route: ${plan.config.seed}, ${plan.steps.length} actions, ${plan.final.turn} turns`);
 await page.locator('a[href="/modules/richman"]').click();await page.locator('.rm-system-dialog').getByRole('button',{name:'继续当前对局'}).click();
 await page.getByRole('button',{name:'掷骰出发',exact:true}).waitFor();
 await page.locator('.rm-game-toolbar').getByRole('button',{name:'新建对局',exact:true}).click();
 const setup=page.getByRole('dialog',{name:'开启一场新旅程'});
 await setup.getByText('高级设置 · 历史模式、电脑策略与种子',{exact:true}).click();
 await setup.getByLabel(/游戏模式/).selectOption('economy');
 for(const name of ['孙小美','阿土伯','钱夫人','沙隆巴斯'])await setup.getByRole('checkbox',{name,exact:true}).setChecked(['孙小美','钱夫人'].includes(name));
 await setup.getByLabel(/每人初始资金/).selectOption('50000');await setup.getByLabel(/对局种子/).fill(plan.config.seed);
 await setup.getByRole('button',{name:'开始新对局'}).click();
 const host=page.locator('[data-window-host]'),captured=new Set();
 for(const step of plan.steps){
  await page.waitForFunction(({phase,revision})=>{const d=document.querySelector('[data-testid="richman-viewport"]')?.dataset;return d?.phase===phase&&Number(d.revision)===revision;},step);
  const a=step.action;
  if(a.type==='roll'||a.type==='endTurn')await page.getByRole('button',{name:a.type==='roll'?'掷骰出发':'下一位',exact:true}).click();
  else if(a.type==='choose')await host.getByRole('group',{name:'选择岔路'}).getByRole('button').filter({hasText:new RegExp(` · ${a.node}号`)}).click();
  else if(a.type==='property'){
   if(!captured.has(step.operation)){
    captured.add(step.operation);await page.screenshot({path:output+'/property-'+step.operation+'.png',fullPage:true});
    assert.equal(await host.locator('.rm-native-prompt').count(),1);
    assert.equal(await host.getByRole('button',{name:'关闭窗口'}).isDisabled(),true);
    if(step.operation==='rent')assert.equal(await host.getByRole('button',{name:'暂时放弃'}).count(),0);
   }
   await host.getByRole('group',{name:'当前地产决策'}).getByRole('button',{name:a.accept?/确认购买|确认升级|支付租金/:'暂时放弃'}).click();
  } else if(a.type==='bank'){
   const bank=host.getByRole('region',{name:'银行存取款'}),input=bank.getByLabel(/金额（整数元）/);
   await bank.getByLabel(/^业务/).selectOption(a.operation);
   // Native keypad edits only; rapidly repeated digits must not be suppressed as duplicate submissions.
   await bank.getByRole('button',{name:'清空金额'}).click();
   await bank.getByRole('button',{name:'输入 1',exact:true}).dblclick();
   await bank.getByRole('button',{name:'输入 0',exact:true}).click();assert.equal(await input.inputValue(),'110');
   assert.equal(Number(await page.getByTestId('richman-viewport').getAttribute('data-revision')),step.revision);
   if(!captured.has('bank')){
    captured.add('bank');await page.screenshot({path:output+'/bank-desktop.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});await input.scrollIntoViewIfNeeded();
    assert.equal(await input.inputValue(),'110');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:output+'/bank-mobile.png',fullPage:true});
    const sizes=await bank.locator('.rm-native-keypad button').evaluateAll(bs=>bs.map(b=>b.getBoundingClientRect().height));assert.ok(sizes.every(h=>h>=44));
    await page.setViewportSize({width:1440,height:1080});
   }
   await bank.getByRole('button',{name:a.operation==='withdraw'?'确认取款':'确认存款',exact:true}).dblclick();
  } else if(a.type==='leaveBank')await host.getByRole('button',{name:/离开银行/}).click();
 }
 // The bank may resume movement; wait for its next settled decision before opening diagnostics.
 if(built){
  const bankReport={stage:'UI-04-built',seed:plan.config.seed,uiCommands:plan.steps.length,covered:[...captured],keypadAndTransfers:true,errors};
  assert.deepEqual(errors,[]);fs.writeFileSync(output+'/results.json',JSON.stringify(bankReport,null,2));console.log('UI-04 built purchase and bank UI passed');return;
 }
 await page.getByRole('button',{name:'更多功能',exact:true}).click();await host.getByRole('button',{name:'运行信息与验证工具',exact:true}).click();
 const download=page.waitForEvent('download');await host.getByRole('button',{name:'下载回放记录'}).click();await(await download).saveAs(output+'/replay.json');
 const replay=JSON.parse(fs.readFileSync(output+'/replay.json','utf8'));
 const final=await page.evaluate(async replay=>{const{replayGame}=await import('/src/features/richman/game/engine.ts');const m=await(await fetch('/richman/generated/manifest.json')).json();const e=replayGame(m.map.nodes,replay);return{economy:e.state.economy,phase:e.state.phase,turn:e.state.turn,events:e.events.filter(x=>['propertySettled','bankTransferred'].includes(x.type))};},replay);
 assert.deepEqual(final.economy,plan.final.economy);assert.equal(final.turn,plan.final.turn);assert.equal(final.phase,plan.final.phase);assert.deepEqual(errors,[]);
 fs.writeFileSync(output+'/results.json',JSON.stringify({stage:'UI-04',seed:plan.config.seed,uiCommands:plan.steps.length,turn:final.turn,covered:[...captured],animation:'only repeated existing 50ms ticks; no map/economy/state injection',replayEconomyMatches:true,errors},null,2));
 console.log('UI-04 purchase, upgrade, rent, bank keypad/transfer and replay passed');
 }catch(error){await page.screenshot({path:output+'/failure.png',fullPage:true});throw error;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
