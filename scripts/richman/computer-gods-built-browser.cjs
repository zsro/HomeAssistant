/** Real mixed-seat UI: automatic seats are never clicked by the runner. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const baseUrl=process.env.RICHMAN_BASE_URL||'http://127.0.0.1:5186';
if(!['localhost','127.0.0.1','[::1]'].includes(new URL(baseUrl).hostname))throw Error('Local only');
const path='/private/tmp/richman-computer-gods-built';fs.mkdirSync(path,{recursive:true});

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
const button=name=>page.getByRole('button',{name,exact:true}),view=page.getByTestId('richman-viewport'),dialog=page.getByRole('dialog');
await button('新建对局').click();await dialog.getByLabel(/游戏模式/).selectOption('stockCircuit');
assert.equal(await dialog.getByLabel('电脑策略',{exact:true}).inputValue(),'basic-v1');
for(const select of await dialog.locator('.rm-seat-controls select').all()){assert.equal(await select.inputValue(),'human');await select.selectOption('computer');}
await dialog.getByLabel('电脑策略',{exact:true}).selectOption('gods-v1');await dialog.getByLabel(/每人初始资金/).selectOption('30000');await dialog.getByLabel(/对局种子/).fill('tools-built');
await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await dialog.screenshot({path:path+'/setup-390.png'});await page.setViewportSize({width:1440,height:1080});
await dialog.getByRole('button',{name:'开始新对局'}).click();
await page.waitForFunction(()=>document.querySelector('[data-testid="richman-viewport"]').dataset.phase==='effect',{},{timeout:25000});
await button('暂停').click();const frozen=await view.getAttribute('data-revision');await page.waitForTimeout(900);assert.equal(await view.getAttribute('data-revision'),frozen);
assert.ok((await page.getByRole('region',{name:'电脑对手'}).innerText()).includes('神仙行情电脑'));
await page.getByRole('region',{name:'电脑对手'}).screenshot({path:path+'/tools-paused.png'});
async function metadata(){const details=page.locator('.rm-diagnostics');if(await details.getAttribute('open')===null)await details.locator('summary').click();const d=page.waitForEvent('download');await button('下载回放记录').click();const target=path+'/metadata-replay.json';await(await d).saveAs(target);return JSON.parse(fs.readFileSync(target,'utf8'));}
assert.equal((await metadata()).control.policy,'gods-v1');
await button('重新开始').click();await dialog.getByRole('button',{name:'确认重新开始'}).click();await button('新建对局').click();assert.equal(await dialog.getByLabel('电脑策略',{exact:true}).inputValue(),'gods-v1');
await dialog.getByLabel('电脑策略',{exact:true}).selectOption('basic-v1');await dialog.getByRole('button',{name:'开始新对局'}).click();await button('暂停').click();assert.ok((await page.getByRole('region',{name:'电脑对手'}).innerText()).includes('基础电脑'));assert.equal((await metadata()).control.policy,'basic-v1');
await button('新建对局').click();await dialog.getByLabel('电脑策略',{exact:true}).selectOption('tools-v1');await dialog.getByRole('button',{name:'开始新对局'}).click();await button('暂停').click();assert.ok((await page.getByRole('region',{name:'电脑对手'}).innerText()).includes('道具电脑'));assert.equal((await metadata()).control.policy,'tools-v1');
await button('新建对局').click();await dialog.getByLabel('电脑策略',{exact:true}).selectOption('rent-v1');await dialog.getByRole('button',{name:'开始新对局'}).click();await button('暂停').click();assert.ok((await page.getByRole('region',{name:'电脑对手'}).innerText()).includes('租金电脑'));assert.equal((await metadata()).control.policy,'rent-v1');
await button('新建对局').click();await dialog.getByLabel('电脑策略',{exact:true}).selectOption('defense-v1');await dialog.getByRole('button',{name:'开始新对局'}).click();await button('暂停').click();assert.ok((await page.getByRole('region',{name:'电脑对手'}).innerText()).includes('防御电脑'));assert.equal((await metadata()).control.policy,'defense-v1');
await button('新建对局').click();await dialog.getByLabel('电脑策略',{exact:true}).selectOption('estate-v1');await dialog.getByRole('button',{name:'开始新对局'}).click();await button('暂停').click();assert.ok((await page.getByRole('region',{name:'电脑对手'}).innerText()).includes('地产电脑'));assert.equal((await metadata()).control.policy,'estate-v1');
await button('新建对局').click();await dialog.getByLabel('电脑策略',{exact:true}).selectOption('cash-v1');await dialog.getByRole('button',{name:'开始新对局'}).click();await button('暂停').click();assert.ok((await page.getByRole('region',{name:'电脑对手'}).innerText()).includes('资金电脑'));assert.equal((await metadata()).control.policy,'cash-v1');
await button('新建对局').click();await dialog.getByLabel('电脑策略',{exact:true}).selectOption('status-v1');await dialog.getByRole('button',{name:'开始新对局'}).click();await button('暂停').click();assert.ok((await page.getByRole('region',{name:'电脑对手'}).innerText()).includes('状态电脑'));assert.equal((await metadata()).control.policy,'status-v1');
await button('新建对局').click();await dialog.getByLabel('电脑策略',{exact:true}).selectOption('inventory-v1');await dialog.getByRole('button',{name:'开始新对局'}).click();await button('暂停').click();assert.ok((await page.getByRole('region',{name:'电脑对手'}).innerText()).includes('库存电脑'));assert.equal((await metadata()).control.policy,'inventory-v1');
await button('新建对局').click();await dialog.getByLabel('电脑策略',{exact:true}).selectOption('commerce-v1');await dialog.getByRole('button',{name:'开始新对局'}).click();await button('暂停').click();assert.ok((await page.getByRole('region',{name:'电脑对手'}).innerText()).includes('经营电脑'));assert.equal((await metadata()).control.policy,'commerce-v1');
await button('新建对局').click();await dialog.getByLabel('电脑策略',{exact:true}).selectOption('area-v1');await dialog.getByRole('button',{name:'开始新对局'}).click();await button('暂停').click();assert.ok((await page.getByRole('region',{name:'电脑对手'}).innerText()).includes('建拆电脑'));assert.equal((await metadata()).control.policy,'area-v1');
await button('新建对局').click();await dialog.getByLabel('电脑策略',{exact:true}).selectOption('roads-v1');await dialog.getByRole('button',{name:'开始新对局'}).click();await button('暂停').click();assert.ok((await page.getByRole('region',{name:'电脑对手'}).innerText()).includes('道路电脑'));assert.equal((await metadata()).control.policy,'roads-v1');
await button('新建对局').click();await dialog.getByLabel('电脑策略',{exact:true}).selectOption('mobility-v1');await dialog.getByRole('button',{name:'开始新对局'}).click();await button('暂停').click();assert.ok((await page.getByRole('region',{name:'电脑对手'}).innerText()).includes('移动电脑'));assert.equal((await metadata()).control.policy,'mobility-v1');
await button('新建对局').click();for(const select of await dialog.locator('.rm-seat-controls select').all())await select.selectOption('human');await dialog.getByRole('button',{name:'开始新对局'}).click();await page.waitForTimeout(900);assert.equal(await view.getAttribute('data-revision'),'0');assert.equal(await page.getByRole('region',{name:'电脑对手'}).count(),0);
await button('新建对局').click();for(const select of await dialog.locator('.rm-seat-controls select').all())await select.selectOption('computer');await dialog.getByLabel('电脑策略',{exact:true}).selectOption('gods-v1');await dialog.getByRole('button',{name:'开始新对局'}).click();await page.getByRole('link',{name:'模块集合',exact:true}).click();await page.waitForTimeout(900);const cleanup=await page.evaluate(()=>window.__richmanProbe());assert.deepEqual(cleanup,{raf:0,canvas:0});assert.deepEqual(errors,[]);
const report={built:true,policies:13,switchBackToMobility:true,normalSpeed:true,defaultHuman:true,defaultBasic:true,toolsEffect:true,policyMetadata:true,resetPreservesPolicy:true,switchBackToBasic:true,switchBackToTools:true,switchBackToRent:true,switchBackToDefense:true,switchBackToEstate:true,switchBackToCash:true,switchBackToStatus:true,switchBackToRoads:true,switchBackToArea:true,switchBackToCommerce:true,switchBackToInventory:true,humanReplacement:true,exitWhileToolsWaiting:true,setup390:true,cleanup,errors};fs.writeFileSync(path+'/results.json',JSON.stringify(report,null,2));console.log(report);await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
