/** Local normal-speed S2-02h G1 five-card UI regression. Auth mocked only in isolated browser. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const baseUrl = (process.env.RICHMAN_BASE_URL || 'http://127.0.0.1:5174').replace(/\/$/, '');
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseUrl).hostname)) throw Error('Browser fixture requires a local server');
const path = process.env.RICHMAN_TEST_OUTPUT || '/private/tmp/richman-s2-02h-ui';
fs.mkdirSync(path, {recursive:true});
const plan=JSON.parse(fs.readFileSync(process.env.RICHMAN_G1_PLAN || '/private/tmp/richman-g1-journey.json','utf8'));
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
await dialog.getByLabel(/游戏模式/).selectOption('g1');await dialog.getByLabel(/对局种子/).fill(plan.replay.config.seed);
await dialog.getByLabel(/每人初始资金/).selectOption('100000');const roster=dialog.getByRole('checkbox');await roster.nth(2).uncheck();await roster.nth(3).uncheck();
await dialog.getByRole('button',{name:'开始新对局'}).click();
const phase=()=>page.getByTestId('richman-viewport').getAttribute('data-phase');
async function settled(){
 const deadline=Date.now()+20000;
 while(Date.now()<deadline){if(!['rolling','moving'].includes(await phase()))return;await page.waitForTimeout(75);}
 throw Error('Movement timeout');
}
const names={'card:03':'购地卡','card:04':'换地卡','card:05':'换屋卡','card:06':'转向卡','card:12':'拆除卡'};
const catalog=JSON.parse(fs.readFileSync('frontend/src/features/richman/game/japan-properties.json','utf8')).properties;
const completed=[];let turns=0,currentEffect='',commonChecked=false;
for(const command of plan.replay.commands){
 const a=command.action;if(a.type==='animationDone')continue;await settled();
 if(a.type==='roll')await button('掷骰出发').click();
 else if(a.type==='endTurn'){await page.getByRole('button',{name:/下一位/}).click();if(++turns%5===0)console.log(`G1 journey ${turns+1} turns`);}
 else if(a.type==='choose')await page.getByRole('group',{name:'选择岔路'}).getByRole('button').filter({hasText:new RegExp(`· ${a.node}号`)}).click();
 else if(a.type==='property')await page.getByRole('group',{name:'当前地产决策'}).getByRole('button',{name:a.accept?/确认购买|确认升级|支付租金/:/暂时放弃/}).click();
 else if(a.type==='leaveBank')await page.getByRole('button',{name:/离开银行/}).click();
 else if(a.type==='leaveShop')await button('离开商店').click();
 else if(a.type==='buyItem'){
   await button('购买'+names[a.itemId]).click();
   assert.match(await page.getByRole('region',{name:'地产与方向卡片'}).innerText(),new RegExp(names[a.itemId]+' × 1'));
 }else if(a.type==='item'){
   if(a.action.type==='begin'){
     currentEffect=a.action.definitionId;const id=currentEffect.slice(0,7);
     await button(names[id]?'使用'+names[id]:currentEffect.startsWith('tool:08')?'使用遥控骰子':currentEffect.startsWith('tool:09')?'使用机器工人':'使用路障').click();
   }else if(names[currentEffect.slice(0,7)]){
     const id=currentEffect.slice(0,7),name=names[id],choice=page.getByRole('region',{name:name+'选择'}),confirm=button('确认使用'+name);
     const select=choice.getByRole('combobox');
     if(id==='card:03')assert.equal(await select.inputValue(),a.action.target.id);else{assert.equal(await confirm.isDisabled(),true);await select.selectOption(a.action.target.id);}
     const preview=await page.getByLabel(name+'结算预览').innerText();assert.ok(preview.includes('消耗 1 张'));
     if(!commonChecked){
       await button('暂停').click();assert.equal(await confirm.isDisabled(),true);assert.equal(await button('取消使用').isDisabled(),true);await button('继续旅程').click();
       await button('取消使用').click();await button('使用'+name).click();if(id!=='card:03')await choice.getByRole('combobox').selectOption(a.action.target.id);
       await button('重新开始').click();await page.keyboard.press('Escape');assert.equal(await page.getByLabel(name+'结算预览').innerText(),preview);
       await button('全屏游戏').click();await page.waitForFunction(()=>!!document.fullscreenElement);await page.screenshot({path:path+'/g1-fullscreen.png'});await button('退出全屏').click();
       await page.setViewportSize({width:390,height:844});await choice.scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path+'/g1-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1080});commonChecked=true;
     }
     await page.screenshot({path:path+'/'+id.replace(':','-')+'-preview.png',fullPage:true});await confirm.click();assert.equal(await phase(),'idle');completed.push({id,preview});
   }else if(currentEffect.startsWith('tool:09')){
     const def=catalog.find(p=>p.id===a.action.target.id),label=def.name+' · '+def.nodeIds.join(' / ')+' 号路格';
     await page.getByRole('radio',{name:new RegExp(label)}).check();await button('确认建造').click();
   }else if(a.value){await page.getByRole('radio',{name:`${a.value} 点`,exact:true}).check();await button('确认并出发').click();}
   else{await page.getByLabel('目标路格',{exact:true}).selectOption(a.action.target.id);await button('确认放置路障').click();}
 }else throw Error('Unsupported '+a.type);
}
await settled();assert.deepEqual(completed.map(c=>c.id).sort(),Object.keys(names).sort());
await button('掷骰出发').click();await settled();await page.locator('.rm-diagnostics summary').click();const download=page.waitForEvent('download');await button('下载回放记录').click();await(await download).saveAs(path+'/replay.json');
const replay=JSON.parse(fs.readFileSync(path+'/replay.json','utf8'));
const verified=await page.evaluate(async replay=>{
 const {GameEngine,replayGame}=await import('/src/features/richman/game/engine.ts');const {default:nodes}=await import('/src/features/richman/japan-topology.fixture.json');
 const engine=new GameEngine(nodes,replay.config),changes=[];
 for(const command of replay.commands){const before=engine.state,result=engine.dispatch(command);if(!result.ok)throw Error('Replay rejected');const event=result.events.find(e=>e.type==='g1Resolved');if(event)changes.push({before,after:engine.state,event});}
 const copy=replayGame(nodes,replay);if(JSON.stringify(copy.state)!==JSON.stringify(engine.state)||JSON.stringify(copy.events)!==JSON.stringify(engine.events))throw Error('Replay mismatch');return{changes,events:engine.events};
},replay);
assert.equal(replay.rulesId,'japan-tools-candidate-v7');assert.equal(verified.changes.length,5);
for(const {before,after,event} of verified.changes){
 assert.deepEqual(before.items,after.items);assert.deepEqual(before.cards,after.cards);assert.deepEqual(before.wealth,after.wealth);assert.deepEqual(before.roadTools,after.roadTools);assert.equal(after.phase,'idle');
 for(const change of event.option.changes)assert.deepEqual(after.economy.properties.find(p=>p.id===change.after.id),change.after);
 if(event.option.transfer){const {from,to,amount}=event.option.transfer;assert.equal(before.economy.balances[from].cash-amount,after.economy.balances[from].cash);assert.equal(before.economy.balances[to].bank+amount,after.economy.balances[to].bank);}else assert.deepEqual(before.economy.balances,after.economy.balances);
 if(event.itemId==='card:06'){assert.notEqual(before.randomState,after.randomState);assert.deepEqual(before.economy,after.economy);}else{assert.equal(before.randomState,after.randomState);assert.deepEqual(before.players,after.players);}
 assert.equal(before.g1.supply[event.itemId]+1,after.g1.supply[event.itemId]);
}
await button('重新开始').click();await button('确认重新开始').click();for(const name of Object.values(names))assert.match(await page.getByRole('region',{name:'地产与方向卡片'}).innerText(),new RegExp(name+' × 0'));
await button('新建对局').click();await page.getByRole('dialog').getByLabel(/游戏模式/).selectOption('wealth');await page.getByRole('dialog').getByRole('button',{name:'开始新对局'}).click();assert.equal(await button('使用购地卡').count(),0);assert.equal(await button('使用均富卡').count(),1);
await page.getByRole('link',{name:'模块集合',exact:true}).click();await page.waitForTimeout(200);const cleanup=await page.evaluate(()=>window.__richmanProbe());assert.deepEqual(cleanup,{raf:0,canvas:0});assert.deepEqual(errors,[]);
const report={baseUrl,normalSpeed:true,map:'original Japan; real UI commands; auth-only fixture; no game-state injection',seed:replay.config.seed,rulesId:replay.rulesId,itemFingerprint:replay.itemFingerprint,
 checks:['earn points and purchase all five','real changes for each card','pause/cancel/reset-dialog','fullscreen','390px','existing worker/roadblock/remote dice','following normal roll','exact replay','reset inventory','v6 mode','cleanup'],
 purchases:verified.events.filter(e=>e.type==='itemBought'),settlements:verified.changes.map(c=>c.event),completed,cleanup,errors};
fs.writeFileSync(path+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
