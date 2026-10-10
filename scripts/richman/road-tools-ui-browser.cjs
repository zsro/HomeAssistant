/** Local normal-speed S2-02e road tools UI regression. Auth mocked only in isolated browser. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = process.env.RICHMAN_TEST_OUTPUT || '/private/tmp/richman-s2-02e-ui';
fs.mkdirSync(path, {recursive:true});
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
await page.getByRole('button',{name:'使用路障',exact:true}).waitFor();
const phase=()=>page.getByTestId('richman-viewport').getAttribute('data-phase');
const button=name=>page.getByRole('button',{name,exact:true});
// Keep this regression bound to v4 when the product default advances.
await button('新建对局').click();await page.getByRole('dialog').getByLabel(/游戏模式/).selectOption('roadTools');
await page.getByRole('dialog').getByRole('button',{name:'开始新对局'}).click();
async function block(node){await button('使用路障').click();await page.getByLabel('目标路格',{exact:true}).selectOption(String(node));await button('确认放置路障').click();}
async function remote(value,firstBranch){
  await button('使用遥控骰子').click();await page.getByRole('radio',{name:`${value} 点`,exact:true}).check();await button('确认并出发').click();
  const deadline=Date.now()+20000;
  while(Date.now()<deadline){
    const p=await phase(); if(p==='turnEnd')return;
    if(p==='choosing'){const choices=page.getByRole('group',{name:'选择岔路'});if(firstBranch){await choices.getByRole('button').filter({hasText:`${firstBranch}号`}).click();firstBranch=null;}else await choices.getByRole('button').first().click();}
    else if(p==='property')await page.getByRole('group',{name:'当前地产决策'}).getByRole('button',{name:/确认购买|确认升级|支付租金/}).click();
    else if(p==='bank')await page.getByRole('button',{name:/离开银行/}).click();
    else if(p==='shop')await button('离开商店').click();
    await page.waitForTimeout(80);
  }throw Error('Movement timeout');
}
await button('使用路障').click();assert.equal(await button('确认放置路障').isDisabled(),true);
const candidates=await page.getByLabel('目标路格',{exact:true}).locator('option').evaluateAll(es=>es.map(e=>e.value));
await page.getByLabel('目标路格',{exact:true}).selectOption('3');
await button('暂停').click();assert.equal(await button('确认放置路障').isDisabled(),true);assert.equal(await button('取消使用').isDisabled(),true);
await button('继续旅程').click();await button('取消使用').click();
assert.match(await page.getByRole('region',{name:'我的道具'}).innerText(),/路障 × 1/);
await button('使用路障').click();assert.equal(await button('确认放置路障').isDisabled(),true);
await page.getByLabel('目标路格',{exact:true}).selectOption('3');await button('全屏游戏').click();
await page.waitForFunction(()=>!!document.fullscreenElement);assert.deepEqual(await page.getByLabel('目标路格',{exact:true}).locator('option').evaluateAll(es=>es.map(e=>e.value)),candidates);
await page.screenshot({path:path+'/road-fullscreen.png'});await button('退出全屏').click();
await button('确认放置路障').click();assert.equal(await phase(),'idle');
await page.screenshot({path:path+'/road-placed.png',fullPage:true});
await button('使用机器娃娃').click();assert.match(await page.getByRole('region',{name:'机器娃娃选择'}).innerText(),/将清除 1 个路障/);
const route=await page.getByLabel('清路路线').innerText();assert.equal(route.split('→').length,10);
await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await page.getByRole('region',{name:'机器娃娃选择'}).scrollIntoViewIfNeeded();await page.screenshot({path:path+'/robot-mobile.png',fullPage:true});
await button('取消使用').click();assert.match(await page.getByRole('region',{name:'我的道具'}).innerText(),/机器娃娃 × 1/);
await button('使用机器娃娃').click();assert.equal(await page.getByLabel('清路路线').innerText(),route);await button('确认清路').click();
assert.match(await page.getByRole('region',{name:'我的道具'}).innerText(),/地图路障：无/);
await page.setViewportSize({width:1440,height:1080});
await button('使用机器工人').click();await page.getByRole('region',{name:'机器工人选择'}).getByRole('radio').first().check();await button('确认建造').click();
await remote(2,3);await page.getByRole('button',{name:/下一位/}).click();
await block(7);await remote(6,7);
await page.screenshot({path:path+'/road-stopped.png',fullPage:true});
await page.locator('.rm-diagnostics summary').click();const download=page.waitForEvent('download');await button('下载回放记录').click();await(await download).saveAs(path+'/replay.json');
const saved=JSON.parse(fs.readFileSync(path+'/replay.json','utf8'));
const verified=await page.evaluate(async saved=>{
  const {GameEngine,replayGame}=await import('/src/features/richman/game/engine.ts');
  const {default:nodes}=await import('/src/features/richman/japan-topology.fixture.json');
  const engine=new GameEngine(nodes,saved.config);let robot=null;
  for(const command of saved.commands){const before=engine.state;const result=engine.dispatch(command);if(!result.ok)throw Error('Rejected replay');if(result.events.some(e=>e.type==='robotCleared'))robot={before,after:engine.state};}
  const copy=replayGame(nodes,saved);if(JSON.stringify(copy.state)!==JSON.stringify(engine.state)||JSON.stringify(copy.events)!==JSON.stringify(engine.events))throw Error('Replay mismatch');
  return {state:engine.state,robot,events:engine.events};
},saved);
assert.equal(verified.state.rulesId,'japan-tools-candidate-v4');assert.deepEqual(verified.robot.before.players,verified.robot.after.players);
assert.deepEqual(verified.robot.before.economy,verified.robot.after.economy);assert.deepEqual(verified.robot.before.items,verified.robot.after.items);
assert.equal(verified.robot.before.randomState,verified.robot.after.randomState);
assert.ok(verified.events.some(e=>e.type==='roadblockStopped'&&e.node===7&&e.discarded===5));
assert.equal(verified.events.filter(e=>e.type==='propertyBuilt').length,1);
assert.deepEqual(verified.state.roadTools.blocks,[]);
await button('重新开始').click();await button('确认重新开始').click();assert.match(await page.getByRole('region',{name:'我的道具'}).innerText(),/路障 × 1/);
for(const mode of ['nearby','construction','tools']){
  await button('新建对局').click();await page.getByRole('dialog').getByLabel(/游戏模式/).selectOption(mode);await page.getByRole('dialog').getByRole('button',{name:'开始新对局'}).click();
  assert.equal(await button('使用路障').count(),0);assert.equal(await button('使用遥控骰子').count(),1);
}
await page.getByRole('link',{name:'模块集合',exact:true}).click();await page.waitForTimeout(200);
const cleanup=await page.evaluate(()=>window.__richmanProbe());assert.deepEqual(cleanup,{raf:0,canvas:0});assert.deepEqual(errors,[]);
const report={normalSpeed:true,map:'original Japan; auth-only fixture, no state injection',rulesId:saved.rulesId,itemFingerprint:saved.itemFingerprint,
  checks:['road selection/cancel','pause','fullscreen stable candidates','map marker','nine-step preview','390px','robot cancel/clear','no player/economy/RNG changes','worker + remote retained','roadblock stops extra five steps','exact replay','reset','legacy modes','cleanup'],
  events:verified.events.filter(e=>['roadblockPlaced','roadblockRemoved','roadblockStopped','robotCleared'].includes(e.type)),cleanup,errors};
fs.writeFileSync(path+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
