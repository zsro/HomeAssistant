/** Local normal-speed S2-02b worker UI regression. Auth mocked only in isolated browser. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = process.env.RICHMAN_TEST_OUTPUT || '/private/tmp/richman-s2-02b-ui';
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
await page.getByRole('button',{name:'使用机器工人',exact:true}).waitFor();
await page.getByRole('button',{name:'新建对局',exact:true}).click();
await page.getByRole('dialog').getByLabel(/游戏模式/).selectOption('construction');
await page.getByRole('dialog').getByLabel(/对局种子/).fill('s2-02b-worker');
await page.getByRole('dialog').getByRole('button',{name:'开始新对局'}).click();
const phase=()=>page.getByTestId('richman-viewport').getAttribute('data-phase');
async function finishMovement(){
  const deadline=Date.now()+15000;
  while(Date.now()<deadline){
    const p=await phase();
    if(p==='turnEnd') return;
    if(p==='choosing') await page.getByRole('group',{name:'选择岔路'}).getByRole('button').first().click();
    else if(p==='bank') await page.getByRole('button',{name:/离开银行/}).click();
    else if(p==='property') await page.getByRole('group',{name:'当前地产决策'}).getByRole('button',{name:/确认购买|确认升级|支付租金/}).click();
    await page.waitForTimeout(80);
  }
  throw Error('Movement did not settle');
}
async function remote(value){
  await page.getByRole('button',{name:'使用遥控骰子',exact:true}).click();
  await page.getByRole('radio',{name:`${value} 点`,exact:true}).check();
  await page.getByRole('button',{name:'确认并出发',exact:true}).click();
  await finishMovement();
}
assert.equal(await page.getByRole('button',{name:'使用机器工人'}).isDisabled(),true);
for(let i=0;i<2;i++){ await remote(1); await page.getByRole('button',{name:'下一位',exact:true}).click(); }
assert.match(await page.locator('.rm-character.is-active').innerText(),/钱夫人/);
await page.getByRole('button',{name:'使用机器工人'}).click();
const choice=page.getByRole('region',{name:'机器工人选择'});
assert.match(await choice.innerText(),/其他玩家的地产/);
assert.equal(await choice.getByRole('button',{name:'确认建造'}).isDisabled(),true);
assert.equal(await page.getByRole('button',{name:'掷骰出发'}).isDisabled(),true);
await choice.getByRole('radio').check();
await page.getByRole('button',{name:'暂停',exact:true}).click();
assert.equal(await choice.getByRole('button',{name:'确认建造'}).isDisabled(),true);
assert.equal(await choice.getByRole('button',{name:'取消使用'}).isDisabled(),true);
await page.waitForTimeout(400); assert.equal(await phase(),'effect');
await page.getByRole('button',{name:'继续旅程',exact:true}).click();
await page.getByRole('button',{name:'重新开始',exact:true}).click(); await page.keyboard.press('Escape');
assert.equal(await choice.getByRole('radio').isChecked(),true);
await choice.getByRole('button',{name:'取消使用'}).click();
assert.match(await page.getByRole('region',{name:'我的道具'}).innerText(),/机器工人 × 1/);
await page.getByRole('button',{name:'使用机器工人'}).click();
assert.equal(await choice.getByRole('button',{name:'确认建造'}).isDisabled(),true);
await page.getByRole('button',{name:'全屏游戏',exact:true}).click();
await page.waitForFunction(()=>!!document.fullscreenElement); await page.waitForTimeout(250);
await page.screenshot({path:path+'/worker-fullscreen.png'});
await page.getByRole('button',{name:'退出全屏',exact:true}).click();
await page.setViewportSize({width:390,height:844}); await choice.scrollIntoViewIfNeeded();
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await page.screenshot({path:path+'/worker-mobile.png',fullPage:true});
await choice.getByRole('radio').check(); await choice.getByRole('button',{name:'确认建造'}).click();
assert.equal(await phase(),'idle');
assert.match(await page.getByRole('region',{name:'我的道具'}).innerText(),/机器工人 × 0/);
assert.equal(await page.getByRole('button',{name:'使用机器工人'}).isDisabled(),true);
await page.setViewportSize({width:1440,height:1080});
await page.screenshot({path:path+'/worker-built.png',fullPage:true});
await remote(2);
await page.locator('.rm-diagnostics summary').click();
const download=page.waitForEvent('download'); await page.getByRole('button',{name:'下载回放记录'}).click();
await (await download).saveAs(path+'/replay.json');
const replay=JSON.parse(fs.readFileSync(path+'/replay.json','utf8'));
const verified=await page.evaluate(async replay=>{
  const {replayGame}=await import('/src/features/richman/game/engine.ts');
  const manifest=await (await fetch('/richman/generated/manifest.json')).json();
  const idx=replay.commands.findIndex(c=>c.action.type==='item'&&c.action.action.type==='confirm'&&c.action.action.target.kind==='property');
  const before=replayGame(manifest.map.nodes,{...replay,commands:replay.commands.slice(0,idx)}).state;
  const after=replayGame(manifest.map.nodes,{...replay,commands:replay.commands.slice(0,idx+1)}).state;
  const final=replayGame(manifest.map.nodes,replay);
  const built=final.events.filter(e=>e.type==='propertyBuilt');
  return {rulesId:final.state.rulesId,built,before,after,consumed:final.events.filter(e=>e.type==='effectConsumed').map(e=>e.itemId),cancelled:final.events.filter(e=>e.type==='effectCancelled').length,remoteAfterBuild:final.events.some(e=>e.type==='effectConsumed'&&e.itemId==='tool:08'&&e.sequence>built[0].sequence)};
},replay);
assert.equal(verified.rulesId,'japan-tools-candidate-v2');
assert.equal(verified.built.length,1); assert.equal(verified.built[0].level,1); assert.equal(verified.built[0].ownerId,'player-1');
assert.deepEqual(verified.before.economy.balances,verified.after.economy.balances);
assert.deepEqual(verified.before.items,verified.after.items);
assert.equal(verified.before.randomState,verified.after.randomState);
assert.deepEqual(verified.before.players,verified.after.players);
assert.equal(verified.after.phase,'idle'); assert.equal(verified.before.turn,verified.after.turn);
assert.deepEqual(verified.consumed,['tool:08','tool:08','tool:09','tool:08']);
assert.equal(verified.cancelled,1); assert.equal(verified.remoteAfterBuild,true);
await page.getByRole('button',{name:'重新开始',exact:true}).click();
await page.getByRole('button',{name:'确认重新开始',exact:true}).click();
assert.match(await page.getByRole('region',{name:'我的道具'}).innerText(),/机器工人 × 1/);
await page.getByRole('button',{name:'新建对局',exact:true}).click();
await page.getByRole('dialog').getByLabel(/游戏模式/).selectOption('tools');
await page.getByRole('dialog').getByRole('button',{name:'开始新对局'}).click();
assert.equal(await page.getByRole('button',{name:'使用机器工人'}).count(),0);
await page.getByRole('button',{name:'使用遥控骰子'}).click();
await page.getByRole('button',{name:'取消使用'}).click();
await page.getByRole('link',{name:'模块集合',exact:true}).click(); await page.waitForTimeout(200);
const cleanup=await page.evaluate(()=>window.__richmanProbe()); assert.deepEqual(cleanup,{raf:0,canvas:0});
assert.deepEqual(errors,[]);
const report={normalSpeed:true,seed:'s2-02b-worker',map:'original Japan, no map/state injection',checks:['location restriction','explicit property selection','pause','cancel without consumption','reset dialog cancel retains target','fullscreen','390px','other-owned property upgrade','cash/points/ownership/RNG preserved','worker then remote dice','downloaded replay','reset restores worker','v1 mode still available','cleanup'],built:verified.built,consumed:verified.consumed,cleanup,errors};
fs.writeFileSync(path+'/results.json',JSON.stringify(report,null,2)); console.log(JSON.stringify(report));
await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
