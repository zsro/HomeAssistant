/** Real mixed-seat UI: automatic seats are never clicked by the runner. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const count=Number(process.env.RICHMAN_PLAYERS||2),baseUrl=process.env.RICHMAN_BASE_URL||'http://127.0.0.1:5185';
if(!['localhost','127.0.0.1','[::1]'].includes(new URL(baseUrl).hostname))throw Error('Local only');
const path='/private/tmp/richman-computer-built';fs.mkdirSync(path,{recursive:true});

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

await page.goto(baseUrl+'/modules/richman');const button=name=>page.getByRole('button',{name,exact:true}),view=page.getByTestId('richman-viewport');await button('新建对局').click();const dialog=page.getByRole('dialog');await dialog.getByLabel(/游戏模式/).selectOption('stockCircuit');for(const select of await dialog.locator('.rm-seat-controls select').all()){assert.equal(await select.inputValue(),'human');await select.selectOption('computer');}await dialog.getByRole('button',{name:'开始新对局'}).click();await page.waitForFunction(()=>Number(document.querySelector('[data-testid="richman-viewport"]').dataset.revision)>0);assert.equal(await button('掷骰出发').isDisabled(),true);await button('暂停').click();const r=await view.getAttribute('data-revision');await page.waitForTimeout(900);assert.equal(await view.getAttribute('data-revision'),r);await page.getByRole('region',{name:'电脑对手'}).screenshot({path:path+'/computer-built.png'});await button('重新开始').click();await page.getByRole('dialog').getByRole('button',{name:'确认重新开始'}).click();await button('新建对局').click();const frozen=await view.getAttribute('data-revision');await page.waitForTimeout(900);assert.equal(await view.getAttribute('data-revision'),frozen);for(const select of await page.getByRole('dialog').locator('.rm-seat-controls select').all())await select.selectOption('human');await page.getByRole('dialog').getByRole('button',{name:'开始新对局'}).click();await page.waitForTimeout(900);assert.equal(await view.getAttribute('data-revision'),'0');assert.equal(await page.getByRole('region',{name:'电脑对手'}).count(),0);
await button('新建对局').click();for(const select of await page.getByRole('dialog').locator('.rm-seat-controls select').all())await select.selectOption('computer');await page.getByRole('dialog').getByRole('button',{name:'开始新对局'}).click();await page.getByRole('link',{name:'模块集合',exact:true}).click();await page.waitForTimeout(900);const cleanup=await page.evaluate(()=>window.__richmanProbe());assert.deepEqual(cleanup,{raf:0,canvas:0});assert.deepEqual(errors,[]);const report={built:true,normalSpeed:true,defaultHuman:true,allComputer:true,pause:true,replacementCancels:true,exitWhileComputerWaiting:true,cleanup,errors};fs.writeFileSync(path+'/results.json',JSON.stringify(report,null,2));console.log(report);await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
