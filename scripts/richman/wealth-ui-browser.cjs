/** Local normal-speed S2-02g global-cash card UI regression. Auth mocked only in isolated browser. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = process.env.RICHMAN_TEST_OUTPUT || '/private/tmp/richman-s2-02g-ui';
fs.mkdirSync(path, {recursive:true});
const plan=JSON.parse(fs.readFileSync(process.env.RICHMAN_WEALTH_PLAN || '/private/tmp/richman-wealth-journey.json','utf8'));
(async()=>{
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1440,height:1080},deviceScaleFactor:1});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())});
const user={id:'richman-validation',username:'validation',displayName:'技术验证',inviteCode:'VALIDATION',invitedByUserId:null,status:'active',createdAt:'2026-09-28T00:00:00.000Z'};
await context.route('http://127.0.0.1:5174/api/**',async route=>{if(route.request().url().endsWith('/users/me'))await route.fulfill({json:{success:true,data:{user}}});else await route.fulfill({status:404,json:{success:false}})});
await context.addInitScript(({user})=>{
localStorage.setItem('home-assistant.session.v1',JSON.stringify({user,tokens:{accessToken:'browser-test-only',refreshToken:'browser-test-only',tokenType:'Bearer',accessExpiresIn:3600,refreshExpiresIn:7200},accessExpiresAt:Date.now()+3600000,refreshExpiresAt:Date.now()+7200000}));
const pending=new Set();const raf=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window);
window.requestAnimationFrame=cb=>{const id=raf(t=>{pending.delete(id);cb(t)});pending.add(id);return id};window.cancelAnimationFrame=id=>{pending.delete(id);cancel(id)};
window.__richmanProbe=()=>({raf:pending.size,canvas:document.querySelectorAll('canvas').length});
},{user});

await page.goto('http://127.0.0.1:5174/modules/richman');
const button=name=>page.getByRole('button',{name,exact:true});
await button('使用均富卡').waitFor();assert.equal(await button('使用均富卡').isDisabled(),true);
await button('新建对局').click();const dialog=page.getByRole('dialog');
await dialog.getByLabel(/游戏模式/).selectOption('wealth');await dialog.getByLabel(/对局种子/).fill(plan.replay.config.seed);
await dialog.getByLabel(/每人初始资金/).selectOption('100000');const roster=dialog.getByRole('checkbox');await roster.nth(3).uncheck();
await dialog.getByRole('button',{name:'开始新对局'}).click();
const phase=()=>page.getByTestId('richman-viewport').getAttribute('data-phase');
async function settled(){
 const deadline=Date.now()+20000;
 while(Date.now()<deadline){if(!['rolling','moving'].includes(await phase()))return;await page.waitForTimeout(75);}
 throw Error('Movement timeout');
}
let turns=0,purchase=null;
for(const command of plan.replay.commands){
 const a=command.action;if(a.type==='animationDone')continue;
 await settled();
 if(a.type==='roll')await button('掷骰出发').click();
 else if(a.type==='endTurn'){await page.getByRole('button',{name:/下一位/}).click();if(++turns%5===0)console.log(`UI journey ${turns+1} turns`);}
 else if(a.type==='choose')await page.getByRole('group',{name:'选择岔路'}).getByRole('button').filter({hasText:new RegExp(`· ${a.node}号`)}).click();
 else if(a.type==='property')await page.getByRole('group',{name:'当前地产决策'}).getByRole('button',{name:a.accept?/确认购买|确认升级|支付租金/:/暂时放弃/}).click();
 else if(a.type==='leaveBank')await page.getByRole('button',{name:/离开银行/}).click();
 else if(a.type==='leaveShop')await button('离开商店').click();
 else if(a.type==='buyItem'){
   assert.equal(a.itemId,'card:01');purchase=await page.getByRole('region',{name:'三越百货'}).innerText();
   assert.match(purchase,/单价 200 点 · 剩余 1 张/);assert.equal(await button('购买均富卡').isDisabled(),false);
   await button('暂停').click();assert.equal(await button('购买均富卡').isDisabled(),true);await button('继续旅程').click();
   await page.screenshot({path:path+'/card-shop.png',fullPage:true});await button('购买均富卡').click();
   assert.match(await page.getByRole('region',{name:'我的均富卡'}).innerText(),/均富卡 × 1/);
 }else if(a.type==='item'){
   if(a.action.type==='begin')await button(a.action.definitionId.startsWith('tool:08')?'使用遥控骰子':'使用路障').click();
   else if(a.value){await page.getByRole('radio',{name:`${a.value} 点`,exact:true}).check();await button('确认并出发').click();}
   else {await page.getByLabel('目标路格',{exact:true}).selectOption(a.action.target.id);await button('确认放置路障').click();}
 }else throw Error(`Unsupported planned action ${a.type}`);
}
await settled();assert.equal(await phase(),'idle');assert.ok(purchase);
await button('使用均富卡').click();const choice=page.getByRole('region',{name:'均富卡确认'});
assert.equal(await button('确认使用均富卡').isDisabled(),false);assert.equal(await choice.getByRole('radio').count(),0);
const preview=await page.getByLabel('均富卡结算预览').innerText();const cash=Object.values(plan.state.economy.balances).map(b=>b.cash),average=Math.floor(cash.reduce((a,b)=>a+b,0)/cash.length);for(const value of cash)assert.ok(preview.includes(`${value.toLocaleString()} → ${average.toLocaleString()}`));
await button('暂停').click();assert.equal(await button('确认使用均富卡').isDisabled(),true);assert.equal(await button('取消使用').isDisabled(),true);
await page.waitForTimeout(200);await button('继续旅程').click();assert.equal(await page.getByLabel('均富卡结算预览').innerText(),preview);
await button('取消使用').click();assert.match(await page.getByRole('region',{name:'我的均富卡'}).innerText(),/均富卡 × 1/);
await button('使用均富卡').click();assert.equal(await button('确认使用均富卡').isDisabled(),false);assert.equal(await choice.getByRole('radio').count(),0);
await button('重新开始').click();await page.keyboard.press('Escape');assert.equal(await page.getByLabel('均富卡结算预览').innerText(),preview);
await button('全屏游戏').click();await page.waitForFunction(()=>!!document.fullscreenElement);assert.equal(await page.getByLabel('均富卡结算预览').innerText(),preview);
await page.screenshot({path:path+'/card-fullscreen.png'});await button('退出全屏').click();
await page.setViewportSize({width:390,height:844});await choice.scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await page.screenshot({path:path+'/card-mobile.png',fullPage:true});await button('确认使用均富卡').click();assert.equal(await phase(),'idle');
assert.match(await page.getByRole('region',{name:'我的均富卡'}).innerText(),/均富卡 × 0/);assert.equal(await button('使用均富卡').isDisabled(),true);
await page.setViewportSize({width:1440,height:1080});await page.screenshot({path:path+'/card-resolved.png',fullPage:true});
await button('使用机器娃娃').click();await button('取消使用').click();
if(!await button('使用机器工人').isDisabled()){await button('使用机器工人').click();await button('取消使用').click();}
await button('掷骰出发').click();await settled();
await page.locator('.rm-diagnostics summary').click();const download=page.waitForEvent('download');await button('下载回放记录').click();await(await download).saveAs(path+'/replay.json');
const replay=JSON.parse(fs.readFileSync(path+'/replay.json','utf8'));
const verified=await page.evaluate(async replay=>{
 const {GameEngine,replayGame}=await import('/src/features/richman/game/engine.ts');const {default:nodes}=await import('/src/features/richman/japan-topology.fixture.json');
 const engine=new GameEngine(nodes,replay.config);let change=null;
 for(const command of replay.commands){const before=engine.state,result=engine.dispatch(command);if(!result.ok)throw Error('Replay rejected');if(result.events.some(e=>e.type==='wealthEqualized'))change={before,after:engine.state,event:result.events.find(e=>e.type==='wealthEqualized')};}
 const copy=replayGame(nodes,replay);if(JSON.stringify(copy.state)!==JSON.stringify(engine.state)||JSON.stringify(copy.events)!==JSON.stringify(engine.events))throw Error('Replay mismatch');
 return {change,state:engine.state,events:engine.events};
},replay);
assert.equal(replay.rulesId,'japan-tools-candidate-v6');const {before,after,event}=verified.change;assert.equal(event.average,average);assert.equal(event.participants.length,3);assert.equal(event.discarded,cash.reduce((a,b)=>a+b,0)%3);
assert.deepEqual(before.players,after.players);assert.deepEqual(before.items,after.items);assert.deepEqual(before.roadTools,after.roadTools);
assert.deepEqual(before.economy.properties,after.economy.properties);assert.equal(before.randomState,after.randomState);
for(const id of Object.keys(before.economy.balances))assert.equal(before.economy.balances[id].bank,after.economy.balances[id].bank);
assert.equal(before.wealth.supply+1,after.wealth.supply);assert.equal(after.phase,'idle');
await button('重新开始').click();await button('确认重新开始').click();assert.match(await page.getByRole('region',{name:'我的均富卡'}).innerText(),/均富卡 × 0/);
await button('新建对局').click();await page.getByRole('dialog').getByLabel(/游戏模式/).selectOption('cards');await page.getByRole('dialog').getByRole('button',{name:'开始新对局'}).click();
assert.equal(await button('使用均富卡').count(),0);assert.equal(await button('使用路障').count(),1);assert.equal(await button('使用均贫卡').count(),1);
await page.getByRole('link',{name:'模块集合',exact:true}).click();await page.waitForTimeout(200);const cleanup=await page.evaluate(()=>window.__richmanProbe());assert.deepEqual(cleanup,{raf:0,canvas:0});assert.deepEqual(errors,[]);
const report={normalSpeed:true,map:'original Japan; public UI commands; auth-only fixture; no game state injection',seed:replay.config.seed,rulesId:replay.rulesId,itemFingerprint:replay.itemFingerprint,
 checks:['earn 200 points','purchase for 200 points','finite stock','three-player global cash preview without selecting targets','pause','cancel without consumption','reset dialog cancellation','fullscreen','390px','cash-only settlement','no RNG/position/bank/property/points changes','existing tools and next roll','exact replay','reset empty cards','v5 mode','cleanup'],
 purchase:verified.events.find(e=>e.type==='itemBought'&&e.itemId==='card:01'),settlement:event,turn:after.turn,cleanup,errors};
fs.writeFileSync(path+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
