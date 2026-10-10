/** Original-map hotseat UI; game-generated animation/tick commands are never injected. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const count=Number(process.env.RICHMAN_PLAYERS||2),route=String(count),baseUrl=process.env.RICHMAN_BASE_URL||'http://127.0.0.1:5175';
if(!['localhost','127.0.0.1','[::1]'].includes(new URL(baseUrl).hostname))throw Error('Local only');
const path='/private/tmp/richman-surrender-confirm-ui-'+route+(process.env.RICHMAN_VISUAL_ONLY?'-visual':'');fs.mkdirSync(path,{recursive:true});
const plan=JSON.parse(fs.readFileSync('/private/tmp/surrender-'+route+'.json','utf8'));
assert.equal(count,plan.replay.config.characterIds.length,'runner seats must match legal plan');
let livePage,liveBrowser;
(async()=>{
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1440,height:1080},deviceScaleFactor:1});
const page=await context.newPage();livePage=page;liveBrowser=browser;
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
const button=name=>page.getByRole('button',{name,exact:true}),viewport=page.getByTestId('richman-viewport');
await button('新建对局').click();const dialog=page.getByRole('dialog');await dialog.getByLabel(/游戏模式/).selectOption('surrender');await dialog.getByLabel(/对局种子/).fill(plan.replay.config.seed);await dialog.getByLabel(/每人初始资金/).selectOption(String(plan.replay.config.initialFunds));await dialog.getByLabel('开局日期').fill(plan.replay.config.startDate);
for(let i=0;i<4;i++)await dialog.getByRole('checkbox').nth(i).setChecked(i<count);
for(let i=0;i<count;i++)await dialog.locator('.rm-seat-controls select').nth(i).selectOption('human');

await dialog.screenshot({path:path+'/setup.png'});await dialog.getByRole('button',{name:'开始新对局'}).click();
await button('认输退出本局').click();assert.equal(await button('确认认输').count(),1);
await button('重新开始').click();await page.keyboard.press('Escape');await page.waitForTimeout(100);assert.equal(await button('确认认输').count(),0);
await button('认输退出本局').click();await button('新建对局').click();await page.keyboard.press('Escape');await page.waitForTimeout(100);assert.equal(await button('确认认输').count(),0);
assert.equal(await button('认输退出本局').isEnabled(),true);assert.deepEqual(errors,[]);
await page.screenshot({path:'/private/tmp/surrender-confirm-lifecycle.png'});
await page.getByRole('link',{name:'模块集合',exact:true}).click();await page.waitForTimeout(850);const cleanup=await page.evaluate(()=>window.__richmanProbe());assert.deepEqual(cleanup,{raf:0,canvas:0});
fs.writeFileSync('/private/tmp/surrender-confirm-lifecycle.json',JSON.stringify({checks:['reset-dialog-cancel-clears-uncommitted-surrender-confirm','new-game-dialog-cancel-clears-uncommitted-surrender-confirm'],errors,cleanup},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
