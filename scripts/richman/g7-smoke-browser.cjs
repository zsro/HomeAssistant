/** G7 original-map browser smoke: does not certify the three research-tool effects. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const baseUrl=process.env.RICHMAN_BASE_URL || 'http://127.0.0.1:5174';
if (!['localhost','127.0.0.1','[::1]'].includes(new URL(baseUrl).hostname)) throw Error('Local only');
const path=process.env.RICHMAN_TEST_OUTPUT || '/private/tmp/richman-s2-02n-smoke';fs.mkdirSync(path,{recursive:true});
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

for(const name of ['时光机','传送机','核子飞弹'])assert.equal(await button('使用'+name).isDisabled(),true);
await page.getByRole('region',{name:'股票市场'}).getByLabel('股数').fill('1');await button('确认买入').click();await page.getByRole('region',{name:'股票市场'}).getByText('交易完成，已更新银行及持仓。').waitFor();
await button('全屏游戏').click();await page.waitForFunction(()=>!!document.fullscreenElement);await page.screenshot({path:path+'/fullscreen.png'});await button('退出全屏').click();
await button('暂停').click();assert.equal(await button('使用时光机').isDisabled(),true);await button('继续旅程').click();
await page.setViewportSize({width:390,height:844});await page.screenshot({path:path+'/narrow.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);await page.setViewportSize({width:1440,height:1080});
await button('掷骰出发').click();await page.waitForFunction(()=>!['前进中','掷骰中'].includes(document.querySelector('.rm-turn-copy small')?.textContent),{},{timeout:20000});
await page.locator('.rm-diagnostics summary').click();const download=page.waitForEvent('download');await button('下载回放记录').click();await(await download).saveAs(path+'/replay.json');
const replay=JSON.parse(fs.readFileSync(path+'/replay.json','utf8'));
const verified=await page.evaluate(async replay=>{const {replayGame}=await import('/src/features/richman/game/engine.ts');const {default:nodes}=await import('/src/features/richman/japan-topology.fixture.json');const a=replayGame(nodes,replay),b=replayGame(nodes,replay);if(JSON.stringify(a.state)!==JSON.stringify(b.state)||JSON.stringify(a.events)!==JSON.stringify(b.events))throw Error('Replay mismatch');return {phase:a.state.phase,stocks:a.state.g6.holdings['player-1'],fingerprint:a.state.items.fingerprint,commands:replay.commands.length};},replay);
assert.equal(replay.rulesId,'japan-tools-candidate-v13');assert.equal(verified.stocks['jp:24'].quantity,1);
await button('重新开始').click();await button('确认重新开始').click();for(const name of ['时光机','传送机','核子飞弹'])assert.equal(await button('使用'+name).isDisabled(),true);
await button('新建对局').click();await page.getByRole('dialog').getByLabel(/游戏模式/).selectOption('g6');await page.getByRole('dialog').getByRole('button',{name:'开始新对局'}).click();assert.equal(await button('使用时光机').count(),0);
await page.getByRole('link',{name:'模块集合',exact:true}).click();await page.waitForTimeout(200);const cleanup=await page.evaluate(()=>window.__richmanProbe());assert.deepEqual(cleanup,{raf:0,canvas:0});assert.deepEqual(errors,[]);
const report={scope:'original-map browser smoke only; NOT research/time/teleport/nuclear effect acceptance',map:'original Japan',normalSpeed:true,authOnlyMock:true,checks:['G7 zero inventory','stock UI buy','pause','fullscreen','390px no horizontal overflow','normal roll','replay parses deterministically','reset','G6 mode preserved','cleanup'],verified,cleanup,errors};fs.writeFileSync(path+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
