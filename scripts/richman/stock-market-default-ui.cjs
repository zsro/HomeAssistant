/** Original Japan, normal-speed UI only. Plan is commands, never injected state. */
const { chromium }=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const group='04a-default',baseUrl=process.env.RICHMAN_BASE_URL||'http://127.0.0.1:5174';
if(!['localhost','127.0.0.1','[::1]'].includes(new URL(baseUrl).hostname))throw Error('Local only');
const path=process.env.RICHMAN_TEST_OUTPUT||'/private/tmp/richman-unified-ui-'+group;fs.mkdirSync(path,{recursive:true});
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
await button('使用均富卡').waitFor();
const panel=page.getByRole('region',{name:'破产资产处置'});assert.ok((await panel.innerText()).includes('负分红扣款不再进入公司或公共账本'));
await page.locator('.rm-diagnostics summary').click();const download=page.waitForEvent('download');await button('下载回放记录').click();await(await download).saveAs(path+'/replay.json');const replay=JSON.parse(fs.readFileSync(path+'/replay.json','utf8'));assert.equal(replay.rulesId,'japan-events-candidate-v42');assert.equal(replay.itemFingerprint,'3d941ac1');
await button('新建对局').click();assert.equal(await page.getByRole('dialog').getByLabel(/游戏模式/).inputValue(),'stockMarket');assert.equal(await page.getByRole('dialog').getByLabel('开局日期').count(),1);await page.keyboard.press('Escape');
await page.setViewportSize({width:390,height:844});await panel.scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await panel.screenshot({path:path+'/default-390.png'});
await page.getByRole('link',{name:'模块集合',exact:true}).click();await page.waitForTimeout(200);const cleanup=await page.evaluate(()=>window.__richmanProbe());assert.deepEqual(cleanup,{raf:0,canvas:0});assert.deepEqual(errors,[]);fs.writeFileSync(path+'/results.json',JSON.stringify({rulesId:replay.rulesId,fingerprint:replay.itemFingerprint,defaultMode:'stockMarket',cleanup,errors}));console.log('v42 default mode, export, narrow view and cleanup passed');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
