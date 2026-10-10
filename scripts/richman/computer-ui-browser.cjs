/** Real mixed-seat UI: automatic seats are never clicked by the runner. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const count=Number(process.env.RICHMAN_PLAYERS||2),baseUrl=process.env.RICHMAN_BASE_URL||'http://127.0.0.1:5175';
if(!['localhost','127.0.0.1','[::1]'].includes(new URL(baseUrl).hostname))throw Error('Local only');
const path='/private/tmp/richman-computer-ui-'+count;fs.mkdirSync(path,{recursive:true});
const plan=JSON.parse(fs.readFileSync('/private/tmp/computer-plan-'+count+'.json','utf8'));
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
const button=name=>page.getByRole('button',{name,exact:true}),viewport=page.getByTestId('richman-viewport');
await button('新建对局').click();const dialog=page.getByRole('dialog');await dialog.getByLabel(/游戏模式/).selectOption('stockCircuit');await dialog.getByLabel(/对局种子/).fill(plan.replay.config.seed);await dialog.getByLabel(/每人初始资金/).selectOption('10000');await dialog.getByLabel('开局日期').fill(plan.replay.config.startDate);
for(let i=0;i<4;i++)await dialog.getByRole('checkbox').nth(i).setChecked(i<count);
for(let i=0;i<count;i++)await dialog.locator('.rm-seat-controls select').nth(i).selectOption(i%2?'computer':'human');
await dialog.screenshot({path:path+'/setup.png'});await dialog.getByRole('button',{name:'开始新对局'}).click();
let offset=0,lifecycle=false,auto=0,human=0;
const revision=async()=>Number(await viewport.getAttribute('data-revision'));
async function waitRevision(n){await page.waitForFunction(n=>Number(document.querySelector('[data-testid="richman-viewport"]').dataset.revision)>=n,n,{timeout:30000});}
async function act(a){
 if(a.type==='roll')return button('掷骰出发').click();
 if(a.type==='endTurn')return page.getByRole('button',{name:/下一位/}).click();
 if(a.type==='choose')return page.getByRole('group',{name:'选择岔路'}).getByRole('button').filter({hasText:new RegExp(`· ${a.node}号`)}).click();
 if(a.type==='property'){const p=page.getByRole('group',{name:'当前地产决策'});if(a.buildingType!==undefined)await p.getByLabel('建造类型').selectOption(String(a.buildingType));return p.getByRole('button',{name:a.accept?/确认购买|确认升级|支付租金/:/暂时放弃/}).click();}
 if(a.type==='bank'){const p=page.getByRole('region',{name:'银行存取款'});await p.getByLabel(/^业务/).selectOption(a.operation);await p.getByLabel('金额（整数元）').fill(String(a.amount));return button(a.operation==='withdraw'?'确认取款':'确认存款').click();}
 if(a.type==='leaveBank')return page.getByRole('button',{name:/离开银行/}).click();
 if(a.type==='leaveShop')return button('离开商店').click();
 if(a.type==='leaveLottery')return button('离开彩票站').click();
 if(a.type==='facility')return page.getByRole('region',{name:'设施探访'}).getByRole('button',{name:/^离开(监狱|医院)$/}).click();
 if(a.type==='ackNews')return page.getByRole('region',{name:'新闻结算'}).getByRole('button',{name:/继续回合|进入竞价/}).click();
 if(a.type==='ackFortune')return page.getByRole('region',{name:'命运结算'}).getByRole('button',{name:'继续回合'}).click();
 if(a.type==='collectFortuneCard'){const p=page.getByRole('region',{name:'命运结算'});if(a.itemId){await p.getByLabel('命运选取卡片').selectOption(a.itemId);return p.getByRole('button',{name:'确认取卡'}).click();}return p.getByRole('button',{name:'放弃本位'}).click();}
 if(a.type==='ackCompany')return button('确认营业结算').click();
 if(a.type==='spinInsurance')return button('转动保险转盘').click();
 if(a.type==='subscribeCompany')return button('跳过认股').click();
 if(a.type==='constructCompany'){if(a.propertyId){const p=page.getByRole('region',{name:'日产建造与现场认股'});await p.getByLabel('建造地块',{exact:true}).selectOption(a.propertyId);if(a.buildingType!==undefined)await p.getByLabel('日产建筑类型').selectOption(String(a.buildingType));return button('确认日产建造').click();}return button('取消建造').click();}
 if(a.type==='magic'){const p=page.getByRole('region',{name:'魔法屋'});return p.getByRole('button',{name:a.effect===6?'得一张卡片':await p.getByRole('button',{name:'抽取魔法目标'}).count()?'抽取魔法目标':'继续回合',exact:true}).click();}
 if(a.type==='magicBuild')return page.getByRole('region',{name:'魔法屋'}).getByRole('button',{name:'公园',exact:true}).click();
 if(a.type==='minigame')return page.locator('.rm-minigame').getByRole('button',{name:a.input.kind==='ack'?'结算点数并返回':'退出小游戏，保留已得分'}).click();
 if(a.type==='auction')return button('退出竞价').click();
 if(a.type==='reaction')return page.getByRole('region',{name:'反应决策'}).getByRole('button',{name:/不使用免费卡|不使用嫁祸卡/}).click();
 if(a.type==='settleDebt')return button('确认支付现有资金并破产').click();
 throw Error('Unhandled UI '+a.type);
}
for(let i=0;i<plan.replay.commands.length;i++){
 const c=plan.replay.commands[i],a=c.action,isComputer=plan.replay.control.computerIds.includes(plan.replay.config.characterIds[Number(c.playerId.split('-')[1])-1]);
 await waitRevision(i+offset);
 if(isComputer&&a.type!=='animationDone'&&!lifecycle){
  assert.equal(await revision(),i+offset);await button('暂停').click();offset++;const r=await revision();await page.waitForTimeout(1000);assert.equal(await revision(),r);assert.equal(await button('掷骰出发').isDisabled(),true);
  await button('全屏游戏').click();await page.waitForFunction(()=>!!document.fullscreenElement);await page.screenshot({path:path+'/paused-fullscreen.png'});await button('退出全屏').click();
  await page.setViewportSize({width:390,height:844});await page.getByRole('region',{name:'电脑对手'}).scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path+'/narrow.png'});await page.setViewportSize({width:1440,height:1080});
  await button('继续旅程').click();offset++;
  await button('重新开始').click();offset++;await page.waitForTimeout(850);assert.equal(await revision(),i+offset);await page.keyboard.press('Escape');offset++;
  lifecycle=true;
 }
 if(a.type==='animationDone'||isComputer){if(a.type!=='animationDone')auto++;await waitRevision(i+offset+1);}
 else{assert.equal(await revision(),i+offset);human++;await act(a);await waitRevision(i+offset+1);}
 if(i%100===0)console.log(count,'UI',i,'/',plan.replay.commands.length);
 if((await page.getByRole('region',{name:'电脑对手'}).innerText()).includes('已停止自动操作'))throw Error('Computer stopped');
}
assert.ok(lifecycle&&auto&&human);assert.equal(await revision(),plan.replay.commands.length+offset);
await page.screenshot({path:path+'/final.png'});await page.locator('.rm-diagnostics summary').click();const download=page.waitForEvent('download');await button('下载回放记录').click();await(await download).saveAs(path+'/replay.json');const replay=JSON.parse(fs.readFileSync(path+'/replay.json','utf8'));assert.deepEqual(replay.control,plan.replay.control);
// Reset invalidates old work and preserves control, then replacing with humans must not autoplay.
await button('重新开始').click();await page.getByRole('dialog').getByRole('button',{name:'确认重新开始'}).click();assert.equal(await revision(),0);await page.waitForTimeout(800);assert.equal(await revision(),0);
await button('新建对局').click();for(let i=0;i<count;i++)await page.getByRole('dialog').locator('.rm-seat-controls select').nth(i).selectOption('human');await page.getByRole('dialog').getByRole('button',{name:'开始新对局'}).click();await page.waitForTimeout(900);assert.equal(await revision(),0);assert.equal(await page.getByRole('region',{name:'电脑对手'}).count(),0);
// Leave while an all-computer decision is queued, rather than only from an idle human game.
await button('新建对局').click();for(let i=0;i<count;i++)await page.getByRole('dialog').locator('.rm-seat-controls select').nth(i).selectOption('computer');await page.getByRole('dialog').getByRole('button',{name:'开始新对局'}).click();
await button('新建对局').click();const frozen=await revision();await page.waitForTimeout(900);assert.equal(await revision(),frozen);for(let i=0;i<count;i++)await page.getByRole('dialog').locator('.rm-seat-controls select').nth(i).selectOption('human');await page.getByRole('dialog').getByRole('button',{name:'开始新对局'}).click();await page.waitForTimeout(900);assert.equal(await revision(),0);
await button('新建对局').click();for(let i=0;i<count;i++)await page.getByRole('dialog').locator('.rm-seat-controls select').nth(i).selectOption('computer');await page.getByRole('dialog').getByRole('button',{name:'开始新对局'}).click();await page.getByRole('link',{name:'模块集合',exact:true}).click();await page.waitForTimeout(900);const cleanup=await page.evaluate(()=>window.__richmanProbe());assert.deepEqual(cleanup,{raf:0,canvas:0});assert.deepEqual(errors,[]);
const report={players:count,normalSpeed:true,map:'original Japan; actual human UI and session computer commands; auth fixture only',commands:replay.commands.length,auto,human,lifecycle:['pause stops waiting','resume','reset dialog cancel','reset','replace with humans','exit cleanup','fullscreen','390px'],cleanup,errors};fs.writeFileSync(path+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
