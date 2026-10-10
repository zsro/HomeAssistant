/** Original-map hotseat UI; game-generated animation/tick commands are never injected. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const baseUrl=process.env.RICHMAN_BASE_URL||'http://127.0.0.1:5175';
if(!['localhost','127.0.0.1','[::1]'].includes(new URL(baseUrl).hostname))throw Error('Local only');
const path='/private/tmp/richman-presentation-visual';fs.mkdirSync(path,{recursive:true});
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

const button=name=>page.getByRole('button',{name,exact:true}),viewport=page.getByTestId('richman-viewport'),panel=page.getByRole('region',{name:'电脑对手'});
const revision=async()=>Number(await viewport.getAttribute('data-revision'));
await button('新建对局').click();const dialog=page.getByRole('dialog');await dialog.getByLabel(/游戏模式/).selectOption('surrender');await dialog.getByLabel(/对局种子/).fill('god-closure-ownership');
for(let i=0;i<4;i++)await dialog.getByRole('checkbox').nth(i).setChecked(i<3);
for(let i=0;i<3;i++)await dialog.locator('.rm-seat-controls select').nth(i).selectOption('human');await dialog.getByLabel('电脑策略',{exact:true}).selectOption('research-v1');await dialog.getByRole('button',{name:'开始新对局'}).click();
await button('认输退出本局').click();await button('确认认输').click();
await button('衰神附身玩家 2').click();await page.getByRole('button',{name:/下一位/}).click();
await button('跟随当前角色').click();await page.waitForTimeout(400);
await viewport.screenshot({path:path+'/attached-idle.png'});
await button('掷骰出发').click();
for(let i=0;i<30;i++){if(await page.getByRole('group',{name:'选择岔路'}).count())await page.getByRole('group',{name:'选择岔路'}).getByRole('button').first().click();if(await viewport.getAttribute('data-phase')==='moving')break;await page.waitForTimeout(60);}
await button('暂停').click();const frozen=await revision();await page.waitForTimeout(300);assert.equal(await revision(),frozen);
await viewport.screenshot({path:path+'/attached-moving-paused.png',style:'.rm-pause-shade{visibility:hidden}'});
await button('继续旅程').click();await page.waitForTimeout(400);await button('暂停').click();
await viewport.screenshot({path:path+'/attached-next-frame.png',style:'.rm-pause-shade{visibility:hidden}'});
await page.locator('.rm-diagnostics summary').click();const d=page.waitForEvent('download');await button('下载回放记录').click();await(await d).saveAs(path+'/replay.json');
await page.getByRole('link',{name:'模块集合',exact:true}).click();await page.waitForTimeout(300);const cleanup=await page.evaluate(()=>window.__richmanProbe());assert.deepEqual(cleanup,{raf:0,canvas:0});assert.deepEqual(errors,[]);
const replay=JSON.parse(fs.readFileSync(path+'/replay.json','utf8')),report={players:3,normalSpeed:true,commands:replay.commands.length,visualCapture:'paused screenshots hide only pause overlay via screenshot style; no game-state injection',cleanup,errors};fs.writeFileSync(path+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();
})().catch(async e=>{console.error(e);if(livePage)try{await livePage.screenshot({path:path+'/failure.png'});}catch{}if(liveBrowser)await liveBrowser.close();process.exitCode=1;});
