/** Local normal-speed S2-02j G3 six-card UI regression. Auth mocked only in isolated browser. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const baseUrl = (process.env.RICHMAN_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseUrl).hostname)) throw Error('Browser fixture requires a local server');
const path = process.env.RICHMAN_TEST_OUTPUT || '/private/tmp/richman-s2-02j-ui';
fs.mkdirSync(path, {recursive:true});
const plan=JSON.parse(fs.readFileSync(process.env.RICHMAN_G3_PLAN || '/private/tmp/richman-g3-journey.json','utf8'));
(async()=>{
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1440,height:1080},deviceScaleFactor:1});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())});
const user={id:'richman-validation',username:'validation',displayName:'技术验证',inviteCode:'VALIDATION',invitedByUserId:null,status:'active',createdAt:'2026-09-28T00:00:00.000Z'};
await context.route(baseUrl+'/api/**',async route=>{if(route.request().url().endsWith('/users/me'))await route.fulfill({json:{success:true,data:{user}}});else await route.fulfill({status:404,json:{success:false}})});
await context.addInitScript(({user})=>{
localStorage.setItem('home-assistant.session.v1',JSON.stringify({user,tokens:{accessToken:'browser-test-only',refreshToken:'browser-test-only',tokenType:'Bearer',accessExpiresIn:3600,refreshExpiresIn:7200},accessExpiresAt:Date.now()+3600000,refreshExpiresAt:Date.now()+7200000}));
const pending=new Set();const raf=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window);
window.requestAnimationFrame=cb=>{const id=raf(t=>{pending.delete(id);cb(t)});pending.add(id);return id};window.cancelAnimationFrame=id=>{pending.delete(id);cancel(id)};
window.__richmanProbe=()=>({raf:pending.size,canvas:document.querySelectorAll('canvas').length});
},{user});

await page.goto(baseUrl+'/modules/richman');
const button=name=>page.getByRole('button',{name,exact:true});
await button('使用均富卡').waitFor();assert.equal(await button('使用均富卡').isDisabled(),true);
await button('新建对局').click();const dialog=page.getByRole('dialog');
await dialog.getByLabel(/游戏模式/).selectOption('g3');await dialog.getByLabel(/对局种子/).fill(plan.replay.config.seed);
await dialog.getByLabel(/每人初始资金/).selectOption('100000');const roster=dialog.getByRole('checkbox');await roster.nth(3).uncheck();
await dialog.getByRole('button',{name:'开始新对局'}).click();
const phase=()=>page.getByTestId('richman-viewport').getAttribute('data-phase');
async function settled(){
 const deadline=Date.now()+20000;
 while(Date.now()<deadline){if(!['rolling','moving'].includes(await phase()))return;await page.waitForTimeout(75);}
 throw Error('Movement timeout');
}
const names={'card:13':'抢夺卡','card:18':'复仇卡','card:19':'嫁祸卡','card:20':'免费卡','card:21':'免罪卡','card:29':'同盟卡','card:14':'停留卡','card:16':'梦游卡','card:17':'陷害卡'};
const catalog=JSON.parse(fs.readFileSync('frontend/src/features/richman/game/japan-properties.json','utf8')).properties;
const completed=[],reactions=[];let turns=0,currentEffect='',commonChecked=false,reactionChecked=false;
for(const command of plan.replay.commands){
 const a=command.action;if(a.type==='animationDone')continue;await settled();
 if(a.type==='roll')await button('掷骰出发').click();
 else if(a.type==='endTurn'){await page.getByRole('button',{name:/下一位/}).click();if(++turns%10===0)console.log(`G3 journey ${turns+1} turns`);}
 else if(a.type==='choose')await page.getByRole('group',{name:'选择岔路'}).getByRole('button').filter({hasText:new RegExp(`· ${a.node}号`)}).click();
 else if(a.type==='property')await page.getByRole('group',{name:'当前地产决策'}).getByRole('button',{name:a.accept?/确认购买|确认升级|支付租金/:/暂时放弃/}).click();
 else if(a.type==='settleDebt')await button('确认支付现有资金并破产').click();
 else if(a.type==='leaveBank')await page.getByRole('button',{name:/离开银行/}).click();
 else if(a.type==='leaveShop')await button('离开商店').click();
 else if(a.type==='buyItem')await button('购买'+names[a.itemId]).click();
 else if(a.type==='reaction'){
   const panel=page.getByRole('region',{name:'反应决策'});const text=await panel.innerText();assert.match(text,new RegExp(`请玩家 ${command.playerId.split('-')[1]} 应答`));
   const free=text.includes('· 免费卡'),name=free?'免费卡':'嫁祸卡';
   if(a.targetId)await panel.getByRole('combobox').selectOption(a.targetId);
   if(!reactionChecked){
     await button('暂停').click();assert.equal(await panel.getByRole('button',{name:'使用'+name,exact:true}).isDisabled(),true);assert.equal(await panel.getByRole('button',{name:'不使用'+name}).isDisabled(),true);await button('继续旅程').click();
     await button('重新开始').click();await page.keyboard.press('Escape');assert.equal(await panel.innerText(),text);
     await page.setViewportSize({width:390,height:844});await panel.scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path+'/reaction-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1080});reactionChecked=true;
   }
   await panel.screenshot({path:path+`/reaction-${reactions.length+1}.png`});reactions.push({responder:command.playerId,choice:a.choice,targetId:a.targetId,text});
   await panel.getByRole('button',{name:(a.choice==='use'?'使用':'不使用')+name,exact:true}).click();assert.notEqual(await phase(),'reaction');
 }else if(a.type==='item'){
   if(a.action.type==='begin'){
     currentEffect=a.action.definitionId;const id=currentEffect.slice(0,7);await button(names[id]?'使用'+names[id]:currentEffect.startsWith('tool:08')?'使用遥控骰子':'使用机器工人').click();
   }else if(names[currentEffect.slice(0,7)]){
     const id=currentEffect.slice(0,7),name=names[id],choice=page.getByRole('region',{name:name+'选择'});await choice.getByLabel('目标玩家').selectOption(a.action.target.id);
     if(a.stolenItemId)await choice.getByLabel('抢夺物品').selectOption(a.stolenItemId);
     const preview=await page.getByLabel(name+'结算预览').innerText();const confirm=button('确认使用'+name);
     if(!commonChecked){
       await button('暂停').click();assert.equal(await confirm.isDisabled(),true);assert.equal(await button('取消使用').isDisabled(),true);await button('继续旅程').click();
       await button('取消使用').click();await button('使用'+name).click();await choice.getByLabel('目标玩家').selectOption(a.action.target.id);if(a.stolenItemId)await choice.getByLabel('抢夺物品').selectOption(a.stolenItemId);
       await button('全屏游戏').click();await page.waitForFunction(()=>!!document.fullscreenElement);await page.screenshot({path:path+'/g3-fullscreen.png'});await button('退出全屏').click();commonChecked=true;
     }
     await choice.screenshot({path:path+'/'+id.replace(':','-')+'-preview.png'});await confirm.click();completed.push({id,preview,stolen:a.stolenItemId});
   }else if(currentEffect.startsWith('tool:09')){
     const def=catalog.find(p=>p.id===a.action.target.id),label=def.name+' · '+def.nodeIds.join(' / ')+' 号路格';await page.getByRole('radio',{name:new RegExp(label)}).check();await button('确认建造').click();
   }else if(a.value){await page.getByRole('radio',{name:`${a.value} 点`,exact:true}).check();await button('确认并出发').click();}
   else throw Error('Unsupported item '+JSON.stringify(a));
 }else throw Error('Unsupported '+a.type);
}
await settled();assert.equal(await phase(),'idle');await button('掷骰出发').click();await settled();
await page.locator('.rm-diagnostics summary').click();const download=page.waitForEvent('download');await button('下载回放记录').click();await(await download).saveAs(path+'/replay.json');
const replay=JSON.parse(fs.readFileSync(path+'/replay.json','utf8'));
const verified=await page.evaluate(async replay=>{
 const {GameEngine,replayGame}=await import('/src/features/richman/game/engine.ts');const {default:nodes}=await import('/src/features/richman/japan-topology.fixture.json');
 const engine=new GameEngine(nodes,replay.config),changes=[];
 for(const command of replay.commands){const before=engine.state,result=engine.dispatch(command);if(!result.ok)throw Error('Replay rejected');if(result.events.some(e=>['g3Resolved','reactionOffered','inventoryTransferred'].includes(e.type)))changes.push({before,after:engine.state,events:result.events});}
 const copy=replayGame(nodes,replay);if(JSON.stringify(copy.state)!==JSON.stringify(engine.state)||JSON.stringify(copy.events)!==JSON.stringify(engine.events))throw Error('Replay mismatch');return{changes,events:engine.events,state:engine.state};
},replay);
assert.equal(replay.rulesId,'japan-tools-candidate-v9');assert.deepEqual([...new Set(verified.events.filter(e=>e.type==='g3Resolved').map(e=>e.itemId))].sort(),['card:13','card:18','card:19','card:20','card:21','card:29']);
for(const id of ['card:13','card:18','card:19','card:20','card:21','card:29'])assert.ok(verified.events.some(e=>e.type==='itemBought'&&e.itemId===id));
const transfers=verified.events.filter(e=>e.type==='inventoryTransferred');assert.ok(transfers.some(e=>e.itemId.startsWith('card:')));assert.ok(transfers.some(e=>e.itemId.startsWith('tool:')));
assert.ok(verified.events.some(e=>e.type==='allianceChanged'&&e.remaining===7));assert.ok(verified.events.some(e=>e.type==='allianceChanged'&&e.remaining===0));assert.ok(verified.events.some(e=>e.type==='rentWaived'&&e.reason==='免费卡'));
for(const {before,after,events} of verified.changes){
 assert.equal(before.active,after.active);assert.equal(before.randomState,after.randomState);
 for(const event of events){
  if(event.type==='inventoryTransferred'){assert.equal(after.effects.inventory[event.sourceId][event.itemId],before.effects.inventory[event.sourceId][event.itemId]-1);assert.equal(after.effects.inventory[event.targetId][event.itemId],before.effects.inventory[event.targetId][event.itemId]+1);}
  if(event.type==='g3Resolved'&&event.itemId==='card:21'){assert.equal(after.g2.players[event.sourceId].dream,before.g2.players[event.sourceId].dream);assert.equal(after.effects.inventory[event.sourceId]['card:21'],before.effects.inventory[event.sourceId]['card:21']-1);}
  if(event.type==='g3Resolved'&&event.itemId==='card:18'){assert.equal(after.g2.players[event.sourceId].dream,5);assert.equal(after.g2.players[event.targetId].dream,5);}
  if(event.type==='g3Resolved'&&event.itemId==='card:20')assert.deepEqual(after.economy.balances,before.economy.balances);
 }
}
for(const m of Object.values(verified.state.g2.players))assert.equal(m.dream,0);
await button('重新开始').click();await button('确认重新开始').click();const inventory=page.getByRole('region',{name:'反应与交互卡片'});for(const id of ['card:13','card:18','card:19','card:20','card:21','card:29'])assert.match(await inventory.innerText(),new RegExp(names[id]+' × 0'));assert.equal(await page.getByRole('region',{name:'反应决策'}).count(),0);
await button('新建对局').click();await page.getByRole('dialog').getByLabel(/游戏模式/).selectOption('g2');await page.getByRole('dialog').getByRole('button',{name:'开始新对局'}).click();assert.equal(await page.getByRole('region',{name:'反应与交互卡片'}).count(),0);assert.equal(await button('使用冬眠卡').count(),1);
await page.getByRole('link',{name:'模块集合',exact:true}).click();await page.waitForTimeout(200);const cleanup=await page.evaluate(()=>window.__richmanProbe());assert.deepEqual(cleanup,{raf:0,canvas:0});assert.deepEqual(errors,[]);
const report={baseUrl,normalSpeed:true,map:'original Japan; real UI commands; auth-only fixture; no game-state injection',seed:replay.config.seed,rulesId:replay.rulesId,itemFingerprint:replay.itemFingerprint,
 checks:['earn points and purchase all six','specified card and tool theft','alliance establishment and hostile break','automatic absolution and revenge','third-player redirect and decline','free rent','pause/cancel/reset-dialog','fullscreen','390px reaction','worker and controlled dice','following normal roll','dream expiry','exact replay','reset inventory','v8 mode','cleanup'],commands:replay.commands.length,turn:verified.state.turn,
 purchases:verified.events.filter(e=>e.type==='itemBought'),settlements:verified.events.filter(e=>['g3Resolved','inventoryTransferred','allianceChanged','attackResolved','rentWaived'].includes(e.type)),completed,reactions,cleanup,errors};
fs.writeFileSync(path+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
