/** Local normal-speed S2-02d worker UI regression. Auth mocked only in isolated browser. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = process.env.RICHMAN_TEST_OUTPUT || '/private/tmp/richman-s2-02d-ui';
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
await page.getByRole('dialog').getByLabel(/游戏模式/).selectOption('nearby');
await page.getByRole('dialog').getByLabel(/对局种子/).fill('s2-02d-worker');
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
const definitions=JSON.parse(fs.readFileSync('frontend/src/features/richman/game/japan-properties.json','utf8')).properties;
const manifest=await page.evaluate(async()=>await(await fetch('/richman/generated/manifest.json')).json());
const first=definitions.find(p=>p.id==='japan:land:21'),second=definitions.find(p=>p.id==='japan:land:20');
const choice=page.getByRole('region',{name:'机器工人选择'});
const canvas=page.locator('canvas');
let cameraCenter={x:manifest.map.nodes[0].x,y:manifest.map.nodes[0].y-55};
async function screenPoint(point){
  await canvas.scrollIntoViewIfNeeded();
  const box=await canvas.boundingBox(),zoom=1.2;
  const clamp=(value,half,size)=>half*2>size?size/2:Math.max(half-80,Math.min(size-half+80,value));
  const cx=clamp(cameraCenter.x,box.width/zoom/2,manifest.map.width);
  const cy=clamp(cameraCenter.y,box.height/zoom/2,manifest.map.height);
  return {x:box.x+box.width/2+(point.x-cx)*zoom,y:box.y+box.height/2+(point.y-cy)*zoom};
}
async function clickWorld(point){const p=await screenPoint(point);await page.mouse.click(p.x,p.y);}
async function listPreview(def){await choice.getByRole('radio',{name:new RegExp(def.name+' · '+def.nodeIds.join(' / ')+' 号路格')}).check();cameraCenter={x:def.x,y:def.y-35};}
const checked=()=>choice.getByRole('radio').evaluateAll(list=>list.filter(el=>el.checked).map(el=>el.parentElement.textContent));
await page.getByRole('button',{name:'使用机器工人'}).click();
assert.equal(await choice.getByRole('button',{name:'确认建造'}).isDisabled(),true);
await clickWorld(first); assert.match((await checked())[0],/5 号路格/);
assert.match(await choice.getByRole('status').innerText(),/已选择：大阪 · 5/);
assert.equal(await phase(),'effect');
// Empty and right-click never change selection.
await clickWorld({x:first.x+20,y:first.y-100});assert.match((await checked())[0],/5 号路格/);
const otherPoint=await screenPoint(second);await page.mouse.click(otherPoint.x,otherPoint.y,{button:'right'});await page.keyboard.press('Escape');
assert.match((await checked())[0],/5 号路格/);
await choice.getByRole('button',{name:'取消使用'}).click();
cameraCenter={x:manifest.map.nodes[0].x,y:manifest.map.nodes[0].y-55};
await page.getByRole('button',{name:'使用机器工人'}).click();assert.equal((await checked()).length,0);
const dragStart=await screenPoint(first);await page.mouse.move(dragStart.x,dragStart.y);await page.mouse.down();await page.mouse.move(dragStart.x+60,dragStart.y+20,{steps:5});await page.mouse.up();
assert.equal((await checked()).length,0);
await listPreview(second);
await page.getByRole('button',{name:'暂停',exact:true}).click();await clickWorld(first);
assert.match((await checked())[0],/4 号路格/);
assert.equal(await choice.getByRole('button',{name:'确认建造'}).isDisabled(),true);
await page.getByRole('button',{name:'继续旅程',exact:true}).click();
await page.getByRole('button',{name:'全屏游戏',exact:true}).click();await page.waitForFunction(()=>!!document.fullscreenElement);await page.waitForTimeout(250);
await clickWorld(first);assert.match((await checked())[0],/5 号路格/);
await page.screenshot({path:path+'/map-pick-fullscreen.png'});
await page.getByRole('button',{name:'退出全屏',exact:true}).click();await page.waitForTimeout(150);
await page.setViewportSize({width:390,height:844});
await listPreview(first);await choice.getByRole('button',{name:'取消使用'}).click();
cameraCenter={x:manifest.map.nodes[0].x,y:manifest.map.nodes[0].y-55};
await page.getByRole('button',{name:'使用机器工人'}).click();
// Bring the adjacent pair into the narrow viewport before testing a map selection change.
await listPreview(second);
await clickWorld(first);assert.match((await checked())[0],/5 号路格/);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await page.screenshot({path:path+'/map-pick-mobile.png',fullPage:true});
await choice.getByRole('button',{name:'确认建造'}).click();assert.equal(await phase(),'idle');
assert.match(await page.getByRole('region',{name:'我的道具'}).innerText(),/机器工人 × 0/);
await page.setViewportSize({width:1440,height:1080});
await remote(1);await page.getByRole('button',{name:'下一位',exact:true}).click();
// Player 2 picks the newly built house's opaque sprite pixel, outside the ground diamond.
await page.getByRole('button',{name:'使用机器工人'}).click();await listPreview(first);
await choice.getByRole('button',{name:'取消使用'}).click();
cameraCenter={x:manifest.map.nodes[1].x,y:manifest.map.nodes[1].y-55};
await page.getByRole('button',{name:'使用机器工人'}).click();
const frame=manifest.sprites[`house-1-${(8-first.direction)&7}`];
const offset=await page.evaluate(async frame=>{
 const image=await createImageBitmap(await(await fetch('/richman/generated/sprites.webp')).blob());
 const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);
 const rgba=ctx.getImageData(frame.x,frame.y,frame.width,frame.height).data;image.close();
 for(let y=0;y<frame.height;y++)for(let x=0;x<frame.width;x++)if(rgba[(y*frame.width+x)*4+3]>0&&y-frame.anchorY < -18)return{x:x-frame.anchorX+0.5,y:y-frame.anchorY+0.5};
 throw Error('No house pixel outside marker');
},frame);
await clickWorld({x:first.x+offset.x,y:first.y+offset.y});assert.match((await checked())[0],/5 号路格/);
await page.screenshot({path:path+'/map-pick-house.png',fullPage:true});
await choice.getByRole('button',{name:'确认建造'}).click();assert.equal(await phase(),'idle');
await page.locator('.rm-diagnostics summary').click();const download=page.waitForEvent('download');await page.getByRole('button',{name:'下载回放记录'}).click();await(await download).saveAs(path+'/replay.json');
const replay=JSON.parse(fs.readFileSync(path+'/replay.json','utf8'));
const verified=await page.evaluate(async replay=>{
 const {replayGame}=await import('/src/features/richman/game/engine.ts');const manifest=await(await fetch('/richman/generated/manifest.json')).json();
 const game=replayGame(manifest.map.nodes,replay);const built=game.events.filter(e=>e.type==='propertyBuilt');
 const comparisons=replay.commands.flatMap((c,i)=>{
  if(c.action.type!=='item'||c.action.action.type!=='confirm'||c.action.action.target.kind!=='property')return[];
  const before=replayGame(manifest.map.nodes,{...replay,commands:replay.commands.slice(0,i)}).state;
  const after=replayGame(manifest.map.nodes,{...replay,commands:replay.commands.slice(0,i+1)}).state;
  return[{balances:JSON.stringify(before.economy.balances)===JSON.stringify(after.economy.balances),items:JSON.stringify(before.items)===JSON.stringify(after.items),rng:before.randomState===after.randomState,position:JSON.stringify(before.players)===JSON.stringify(after.players)}];
 });
 return{rulesId:game.state.rulesId,fingerprint:game.state.items.fingerprint,built,comparisons,consumed:game.events.filter(e=>e.type==='effectConsumed').map(e=>e.itemId)};
},replay);
assert.equal(verified.rulesId,'japan-tools-candidate-v3');assert.equal(verified.fingerprint,'18003b93');
assert.equal(verified.built.length,2);assert.deepEqual(verified.built.map(e=>[e.propertyId,e.fromLevel,e.level,e.ownerId]),[['japan:land:21',0,1,null],['japan:land:21',1,2,null]]);
assert.deepEqual(verified.consumed,['tool:09','tool:08','tool:09']);
assert.ok(verified.comparisons.every(c=>Object.values(c).every(Boolean)));
await page.getByRole('button',{name:'重新开始',exact:true}).click();await page.getByRole('button',{name:'确认重新开始',exact:true}).click();
await page.getByRole('button',{name:'使用机器工人'}).click();assert.equal((await checked()).length,0);
assert.equal(await choice.getByRole('button',{name:'确认建造'}).isDisabled(),true);
await page.getByRole('link',{name:'模块集合',exact:true}).click();await page.waitForTimeout(200);
const cleanup=await page.evaluate(()=>window.__richmanProbe());assert.deepEqual(cleanup,{raf:0,canvas:0});assert.deepEqual(errors,[]);
const report={normalSpeed:true,seed:'s2-02d-worker',map:'original Japan, no map/state injection',rulesId:verified.rulesId,itemFingerprint:verified.fingerprint,
 checks:['map land click synchronizes radio/status','empty/right click preserves selection','drag does not select','pause blocks map choice','fullscreen map choice','390px map choice','explicit confirmation only','opaque house pixel outside ground diamond','worker then remote dice','exact downloaded replay','reset clears choice','cleanup'],built:verified.built,consumed:verified.consumed,comparisons:verified.comparisons,cleanup,errors};
fs.writeFileSync(path+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
