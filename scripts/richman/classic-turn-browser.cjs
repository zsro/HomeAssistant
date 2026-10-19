/** UI-02 browser regression: audited layout + existing map/worker/replay flow. Local isolated auth only. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const base = process.env.RICHMAN_TEST_BASE_URL || 'http://127.0.0.1:5174';
const path = process.env.RICHMAN_TEST_OUTPUT || '/private/tmp/richman-ui02-browser';
fs.mkdirSync(path, {recursive:true});
(async()=>{
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1440,height:1080},deviceScaleFactor:1});
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
for(const name of ['读档','存档']){
 const revision=await page.getByTestId('richman-viewport').getAttribute('data-revision');
 await toolbar.getByRole('button',{name,exact:true}).click();
 assert.match(await page.getByRole('dialog',{name,exact:true}).innerText(),/暂未接入/);
 await page.keyboard.press('Escape');assert.equal(Number(await page.getByTestId('richman-viewport').getAttribute('data-revision')),Number(revision)+2);
}
// UI-02: native mask zones, scaled dragging, read-only profiles, minimap and actual GO.
const uiRevision=await page.getByTestId('richman-viewport').getAttribute('data-revision');
const go=page.locator('.rm-classic-go');
const hitZones=await go.evaluate(el=>{
 const rect=el.getBoundingClientRect(),scale=rect.width/72;
 return [[40,33],[4,33],[10,30],[71,66]].map(([x,y])=>{
  const target=document.elementFromPoint(rect.left+x*scale,rect.top+y*scale);
  return target.closest('button')?.getAttribute('aria-label')??target.tagName;
 });
});
assert.deepEqual(hitZones,['GO：掷骰出发','移动 GO 控件（方向键移动）','使用 1 颗骰子','CANVAS']);
let goBox=await go.boundingBox(),goScale=goBox.width/72;
await page.mouse.move(goBox.x+4*goScale,goBox.y+33*goScale);await page.mouse.down();
await page.mouse.move(goBox.x+24*goScale,goBox.y+63*goScale,{steps:5});await page.mouse.up();
assert.equal(await go.evaluate(el=>el.style.left),'200px');assert.equal(await go.evaluate(el=>el.style.top),'150px');
await page.getByRole('button',{name:/移动 GO/}).focus();await page.keyboard.press('ArrowLeft');
assert.equal(await go.evaluate(el=>el.style.left),'192px');
await page.getByRole('tab',{name:'股票',exact:true}).click();
assert.match(await page.getByRole('tabpanel').innerText(),/股票市值/);
await page.getByRole('tab',{name:'其他',exact:true}).click();assert.match(await page.getByRole('tabpanel').innerText(),/暂未接入/);
await page.getByRole('tab',{name:'资金',exact:true}).click();
await toolbar.getByRole('button',{name:'小地图',exact:true}).click();
const minimap=page.getByRole('button',{name:/小地图定位/});
await minimap.click({position:{x:40,y:70}});
const cameraBefore=Number(await page.getByTestId('minimap-camera').getAttribute('x'));
await page.keyboard.press('ArrowRight');
assert.equal(Number(await page.getByTestId('minimap-camera').getAttribute('x')),cameraBefore+120);
assert.equal(await page.getByTestId('richman-viewport').getAttribute('data-revision'),uiRevision);
await page.getByTestId('classic-stage').screenshot({path:path+'/minimap.png'});
await page.getByRole('group',{name:'辅助视图'}).getByRole('button',{name:'日历',exact:true}).click();
await page.getByRole('button',{name:'跟随当前角色',exact:true}).click();
assert.equal(await page.getByTestId('richman-viewport').getAttribute('data-revision'),uiRevision);
await page.getByRole('button',{name:'GO：掷骰出发',exact:true}).click();
await page.waitForFunction(()=>document.querySelector('.rm-viewport').dataset.phase!=='rolling');
const dice=page.getByLabel('本次掷骰结果');
assert.equal(await dice.locator('img').count(),1);assert.match(await dice.innerText(),/总步数 [1-6]/);
await page.screenshot({path:path+'/go-roll.png',fullPage:true});

await page.getByRole('link',{name:'模块集合',exact:true}).click();await page.locator('.rm-system-dialog').getByRole('button',{name:'确认返回模块集合'}).click();await page.locator('.rm-viewport canvas').waitFor({state:'detached'});await page.waitForTimeout(200);
const cleanup=await page.evaluate(()=>window.__richmanProbe());assert.deepEqual(cleanup,{raf:0,canvas:0});assert.deepEqual(errors,[]);
fs.writeFileSync(path+'/results.json',JSON.stringify({stage:'UI-02',layoutChecks,hitZones,checks:['native GO hit mask and transparent corner','scaled pointer/keyboard dragging','profile tabs','minimap changes camera only','real GO roll and individual dice','cleanup'],cleanup,errors},null,2));
await browser.close();console.log('UI-02 turn controls passed');
})().catch(e=>{console.error(e);process.exit(1)});
