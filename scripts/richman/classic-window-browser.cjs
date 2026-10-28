/** UI-03 window regression: audited layout + existing map/worker/replay flow. Local isolated auth only. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const base = process.env.RICHMAN_TEST_BASE_URL || 'http://127.0.0.1:5174';
const path = process.env.RICHMAN_TEST_OUTPUT || '/private/tmp/richman-ui03-browser';
fs.mkdirSync(path, {recursive:true});
(async()=>{
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1440,height:1080},deviceScaleFactor:Number(process.env.RICHMAN_TEST_DPR||1)});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())});
const user={id:'richman-validation',username:'validation',displayName:'技术验证',inviteCode:'VALIDATION',invitedByUserId:null,status:'active',createdAt:'2026-09-28T00:00:00.000Z'};
await context.route(base+'/api/**',async route=>{if(route.request().url().endsWith('/users/me'))await route.fulfill({json:{success:true,data:{user}}});else await route.fulfill({status:404,json:{success:false}})});
await context.addInitScript(({user})=>{
localStorage.setItem('home-assistant.session.v1',JSON.stringify({user,tokens:{accessToken:'browser-test-only',refreshToken:'browser-test-only',tokenType:'Bearer',accessExpiresIn:3600,refreshExpiresIn:7200},accessExpiresAt:Date.now()+3600000,refreshExpiresAt:Date.now()+7200000}));
const pending=new Set();const raf=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window);
window.requestAnimationFrame=cb=>{const id=raf(t=>{pending.delete(id);cb(t)});pending.add(id);return id};window.cancelAnimationFrame=id=>{pending.delete(id);cancel(id)};
window.__richmanProbe=()=>({raf:pending.size,canvas:document.querySelectorAll('canvas').length});
},{user});

await page.goto(base+'/modules/richman');
await page.locator('.rm-system-dialog').getByRole('button',{name:'继续当前对局'}).click();
await page.getByRole('button',{name:'掷骰出发',exact:true}).waitFor().catch(async error=>{ console.error(errors); console.error(await page.locator('body').innerText()); await page.screenshot({path:path+'/load-error.png'}); await browser.close(); throw error; });
const toolbar=page.getByRole('navigation',{name:'原版工具栏'});
assert.deepEqual(await toolbar.getByRole('button').evaluateAll(buttons=>buttons.map(b=>b.getAttribute('aria-label'))),['帮助','设置','托管设置','读档','存档','小地图','人物资料','道具','卡片','地产出售','股票']);
const layoutChecks=[];
async function checkLayout(label){
 await page.waitForTimeout(180);
 const rectangles=await page.evaluate(()=>{
  const stage=document.querySelector('.rm-classic-stage').getBoundingClientRect(),scale=stage.width/640;
  const regions=['.rm-classic-toolbar','.rm-classic-map','.rm-classic-player','.rm-classic-auxiliary'].map(selector=>{
   const r=document.querySelector(selector).getBoundingClientRect();return [(r.left-stage.left)/scale,(r.top-stage.top)/scale,r.width/scale,r.height/scale];
  });
  const viewport=document.querySelector('.rm-viewport');return {compact:document.querySelector('.rm-classic-frame').classList.contains('is-compact'),regions,logical:[viewport.clientWidth,viewport.clientHeight],canvases:document.querySelectorAll('canvas').length,overflow:document.documentElement.scrollWidth>innerWidth};
 });
 const expected=[[0,0,440,40],[0,40,440,440],[440,0,200,280],[440,280,200,200]];
 if(!rectangles.compact) rectangles.regions.forEach((r,i)=>r.forEach((v,j)=>assert.ok(Math.abs(v-expected[i][j])<.02,`${label}: region ${i} dimension ${j}: ${v}`)));
 assert.deepEqual(rectangles.logical,[440,440]);assert.equal(rectangles.canvases,1);assert.equal(rectangles.overflow,false);
 layoutChecks.push({label,...rectangles});
}
await page.waitForFunction(()=>[...document.querySelectorAll('.rm-classic-stage img')].every(i=>i.complete&&i.naturalWidth>0));
await checkLayout('desktop-1440');
await page.screenshot({path:path+'/desktop.png',fullPage:true});
const baselineRevision=await page.getByTestId('richman-viewport').getAttribute('data-revision');
const initialBox=await page.getByTestId('classic-stage').boundingBox();
await page.setViewportSize({width:900,height:Math.round(1080+480-initialBox.height)});
await checkLayout('logical-640x480');
assert.ok(Math.abs((await page.getByTestId('classic-stage').boundingBox()).width-640)<1);
await page.getByTestId('classic-stage').screenshot({path:path+'/logical-640x480.png'});
for(const viewport of [{width:640,height:480},{width:1280,height:960},{width:844,height:390},{width:390,height:844}]){
 await page.setViewportSize(viewport);await checkLayout(`${viewport.width}x${viewport.height}`);
 if(viewport.width===390)await page.screenshot({path:path+'/mobile.png',fullPage:true});
}
await page.setViewportSize({width:1440,height:1080});
assert.equal(await page.getByTestId('richman-viewport').getAttribute('data-revision'),baselineRevision);
const window=page.locator('[data-window-host]');
const phase=()=>page.getByTestId('richman-viewport').getAttribute('data-phase');
const revision=()=>page.getByTestId('richman-viewport').getAttribute('data-revision');
async function closeBrowse(){await window.getByRole('button',{name:'关闭窗口',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('[data-window-host]').open);}
async function openItems(){await toolbar.getByRole('button',{name:'道具',exact:true}).click();}
const checks=[];
for(const name of ['读档','存档']){
 const before=await revision(); await toolbar.getByRole('button',{name,exact:true}).click();
 assert.match(await page.getByRole('dialog',{name,exact:true}).innerText(),/暂未接入/);
 await page.keyboard.press('Escape');assert.equal(Number(await revision()),Number(before)+2);
}
await toolbar.getByRole('button',{name:'设置',exact:true}).click();
const system=page.locator('.rm-system-dialog');
assert.equal(await system.evaluate(el=>el.matches(':modal')),true);
assert.equal(await system.getByRole('group',{name:'游戏声音'}).count(),1);
const beforeBrowse=await revision();
await system.getByRole('button',{name:'返回对局'}).focus();await page.keyboard.press('Tab');
assert.equal(await page.evaluate(()=>document.querySelector('.rm-system-dialog').contains(document.activeElement)),true);
await page.screenshot({path:path+'/settings.png',fullPage:true});
await page.keyboard.press('Escape');assert.equal(await toolbar.getByRole('button',{name:'设置',exact:true}).evaluate(el=>el===document.activeElement),true);
assert.equal(Number(await revision()),Number(beforeBrowse)+1);
await toolbar.getByRole('button',{name:'帮助',exact:true}).click();
assert.equal(await page.locator('.rm-system-dialog .rm-help').evaluate(el=>el.open),true);await page.keyboard.press('Escape');
await toolbar.getByRole('button',{name:'人物资料',exact:true}).click();assert.equal(await window.locator('.rm-character').count(),4);await closeBrowse();
await page.getByRole('button',{name:'更多功能',exact:true}).click();
assert.equal(await window.getByRole('navigation',{name:'全部功能'}).getByRole('button').count(),29);
await page.screenshot({path:path+'/directory.png',fullPage:true});await closeBrowse();
checks.push('single modal host and one audio/character component','Tab stays in modal; Escape restores toolbar focus','settings changes pause state only','all additional entries available');

if(process.env.RICHMAN_BUILT_SMOKE==='1'){
 await page.getByRole('link',{name:'模块集合',exact:true}).click();await page.locator('.rm-system-dialog').getByRole('button',{name:'确认返回模块集合'}).click();await page.locator('.rm-viewport canvas').waitFor({state:'detached'});await page.waitForTimeout(200);
 const cleanup=await page.evaluate(()=>window.__richmanProbe());assert.deepEqual(cleanup,{raf:0,canvas:0});assert.deepEqual(errors,[]);
 const report={stage:'UI-03-built',layoutChecks,checks,cleanup,errors};fs.writeFileSync(path+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();return;
}
await page.locator('.rm-game-toolbar').getByRole('button',{name:'新建对局',exact:true}).click();
await page.getByRole('dialog',{name:'开启一场新旅程'}).getByText('高级设置 · 历史模式、电脑策略与种子',{exact:true}).click();
await page.getByRole('dialog',{name:'开启一场新旅程'}).getByLabel(/游戏模式/).selectOption('nearby');
await page.getByRole('dialog',{name:'开启一场新旅程'}).getByLabel(/对局种子/).fill('s2-02d-worker');
await page.getByRole('button',{name:'开始新对局',exact:true}).click();
await openItems();await page.getByRole('button',{name:'使用机器工人',exact:true}).click();
const choice=window.getByRole('region',{name:'机器工人选择'});await choice.waitFor();await page.waitForFunction(()=>{const d=document.querySelector('[data-window-host]');return d.open&&!d.matches(':modal');});
assert.equal(await window.evaluate(el=>el.open&&!el.matches(':modal')),true);
assert.equal(await choice.getByRole('button',{name:'确认建造'}).isDisabled(),true);
const definitions=JSON.parse(fs.readFileSync('shared/richman/game/japan-properties.json','utf8')).properties;
const first=definitions.find(p=>p.id==='japan:land:21'),second=definitions.find(p=>p.id==='japan:land:20');
const manifest=await page.evaluate(async()=>await(await fetch('/richman/generated/manifest.json')).json());
const canvas=page.locator('canvas');let cameraZoom=1.2,cameraCenter={x:manifest.map.nodes[0].x,y:manifest.map.nodes[0].y-55};
async function screenPoint(point){
 await canvas.scrollIntoViewIfNeeded();const box=await canvas.boundingBox(),scale=box.width/440,half=440/cameraZoom/2;
 const clamp=(value,size)=>half*2>size?size/2:Math.max(half-80,Math.min(size-half+80,value));
 return{x:box.x+box.width/2+(point.x-clamp(cameraCenter.x,manifest.map.width))*cameraZoom*scale,y:box.y+box.height/2+(point.y-clamp(cameraCenter.y,manifest.map.height))*cameraZoom*scale};
}
async function minimize(){if(await window.evaluate(el=>el.open))await window.getByRole('button',{name:'收起窗口，地图选点'}).click();}
async function restore(){await page.getByRole('button',{name:'返回当前操作',exact:true}).click();}
async function clickWorld(point){await minimize();const p=await screenPoint(point);await page.mouse.click(p.x,p.y);await restore();}
async function listPreview(def){await choice.getByRole('radio',{name:new RegExp(def.name+' · '+def.nodeIds.join(' / ')+' 号路格')}).check();cameraCenter={x:def.x,y:def.y-35};cameraZoom=1.2;}
const checked=()=>choice.getByRole('radio').evaluateAll(list=>list.filter(el=>el.checked).map(el=>el.parentElement.textContent));
const beforeMap=await revision();await page.keyboard.press('Escape');assert.equal(await window.evaluate(el=>el.open),false);
assert.equal(await phase(),'effect');assert.equal(await revision(),beforeMap);await restore();
// The floating panel can cover the redundant page shortcut; verify its keyboard path too.
await page.getByRole('button',{name:'回到地图',exact:true}).focus();await page.keyboard.press('Enter');assert.equal(await window.evaluate(el=>el.open),false);await restore();
await clickWorld(first);assert.match((await checked())[0],/5 号路格/);
await listPreview(second);await minimize();
await page.getByRole('button',{name:'全屏游戏',exact:true}).click();await page.waitForFunction(()=>!!document.fullscreenElement);await checkLayout('native-fullscreen');
await restore();assert.match((await checked())[0],/4 号路格/);await page.screenshot({path:path+'/map-selection-fullscreen.png'});
await minimize();await page.getByRole('button',{name:'退出全屏',exact:true}).click();
await page.setViewportSize({width:390,height:844});await checkLayout('mobile-map-selection');
await clickWorld(first);assert.match((await checked())[0],/5 号路格/);
assert.equal(await window.evaluate(el=>{const r=el.getBoundingClientRect();return [.25,.5,.75].every(f=>document.elementFromPoint(r.x+r.width/2,r.y+r.height*f)?.closest('[data-window-host]')===el);}),true);
await page.screenshot({path:path+'/map-selection-mobile.png',fullPage:true});
await window.getByRole('button',{name:'暂停',exact:true}).click();await page.locator('.rm-system-dialog').getByRole('heading',{name:'游戏已暂停'}).waitFor();const pausedRevision=await revision();await page.waitForTimeout(150);assert.equal(await revision(),pausedRevision);
await page.locator('.rm-system-dialog').getByRole('button',{name:'继续旅程',exact:true}).click();
await choice.getByRole('button',{name:'确认建造'}).dblclick();assert.equal(await phase(),'idle');
await page.waitForFunction(()=>!document.querySelector('[data-window-host]').open);
checks.push('effect opens nonmodal window','Escape minimizes without consuming or cancelling','map selection survives fullscreen/mobile/pause','double-click construction consumes once','completed decision closes automatically');

await page.setViewportSize({width:1440,height:1080});await openItems();
await page.getByRole('button',{name:'使用遥控骰子',exact:true}).click();
await page.getByRole('radio',{name:'1 点',exact:true}).check();await page.getByRole('button',{name:'确认并出发',exact:true}).click();
const deadline=Date.now()+15000;
let requiredObserved=false;
while(Date.now()<deadline && await phase()!=='turnEnd'){
 const p=await phase();
 if(p==='choosing')await page.getByRole('group',{name:'选择岔路'}).getByRole('button').first().click();
 else if(p==='bank')await page.getByRole('button',{name:/离开银行/}).click();
 else if(p==='property'){
  requiredObserved=true;const before=await revision();assert.equal(await window.evaluate(el=>el.matches(':modal')),true);
  await page.keyboard.press('Escape');assert.equal(await window.evaluate(el=>el.open),true);assert.equal(await revision(),before);
  assert.equal(await window.getByRole('button',{name:'关闭窗口'}).isDisabled(),true);
  await page.screenshot({path:path+'/property-required.png',fullPage:true});
  // Configuration cancellation restores the existing decision and original pause state.
  await window.getByRole('button',{name:'新建对局'}).click();assert.equal(await window.evaluate(el=>el.open),false);
  await page.getByRole('dialog',{name:'开启一场新旅程'}).getByRole('button',{name:'取消',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[data-window-host]').open);
  assert.equal(await phase(),'property');assert.equal(await window.getByRole('button',{name:'暂停',exact:true}).isVisible(),true);
  await window.getByRole('button',{name:'暂停',exact:true}).click();
  await page.locator('.rm-system-dialog').getByRole('heading',{name:'游戏已暂停'}).waitFor();assert.equal(await phase(),'property');
  await page.locator('.rm-system-dialog').getByRole('button',{name:'继续旅程',exact:true}).click();
  await page.getByRole('group',{name:'当前地产决策'}).getByRole('button',{name:/确认购买|确认升级|支付租金/}).dblclick();
 }
 await page.waitForTimeout(80);
}
assert.equal(await phase(),'turnEnd');assert.equal(requiredObserved,true);
checks.push('real landing opens mandatory modal','Escape cannot skip property decision','configuration cancellation restores decision and pause state','property double-click does not affect next turn');

await page.getByRole('button',{name:'更多功能',exact:true}).click();
await window.getByRole('button',{name:'运行信息与验证工具',exact:true}).click();
const download=page.waitForEvent('download');await window.getByRole('button',{name:'下载回放记录'}).click();await(await download).saveAs(path+'/replay.json');
const replay=JSON.parse(fs.readFileSync(path+'/replay.json','utf8'));
const verified=await page.evaluate(async replay=>{
 const{replayGame}=await import('/src/features/richman/game/engine.ts');const m=await(await fetch('/richman/generated/manifest.json')).json();
 const game=replayGame(m.map.nodes,replay);
 return{built:game.events.filter(e=>e.type==='propertyBuilt'),consumed:game.events.filter(e=>e.type==='effectConsumed').map(e=>e.itemId),phase:game.state.phase,turn:game.state.turn,revision:game.state.revision};
},replay);
assert.deepEqual(verified.consumed,['tool:09','tool:08']);assert.equal(verified.built.length,1);assert.equal(verified.turn,1);assert.equal(verified.phase,'turnEnd');
await closeBrowse();
// Fallback fullscreen: Escape dismisses only the window on its first press.
await page.evaluate(()=>Object.defineProperty(document,'fullscreenEnabled',{configurable:true,get:()=>false}));
await page.getByRole('button',{name:'全屏游戏',exact:true}).click();await toolbar.getByRole('button',{name:'设置',exact:true}).click();
await page.keyboard.press('Escape');assert.equal(await page.locator('.rm-page').evaluate(el=>el.classList.contains('is-expanded')),true);
await page.keyboard.press('Escape');assert.equal(await page.locator('.rm-page').evaluate(el=>el.classList.contains('is-expanded')),false);
await page.getByRole('link',{name:'模块集合',exact:true}).click();await page.locator('.rm-system-dialog').getByRole('button',{name:'确认返回模块集合'}).click();await page.locator('.rm-viewport canvas').waitFor({state:'detached'});await page.waitForTimeout(200);
const cleanup=await page.evaluate(()=>window.__richmanProbe());assert.deepEqual(cleanup,{raf:0,canvas:0});assert.deepEqual(errors,[]);
checks.push('downloaded replay verifies one worker and one remote die','Escape closes window before fallback fullscreen','route cleanup');
const report={stage:'UI-03',layoutChecks,checks,verified,cleanup,errors};fs.writeFileSync(path+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
