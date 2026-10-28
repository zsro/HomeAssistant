/** Real mixed-seat UI: automatic seats are never clicked by the runner. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const count=Number(process.env.RICHMAN_PLAYERS||2),route=process.env.RICHMAN_ROUTE||String(count),baseUrl=process.env.RICHMAN_BASE_URL||'http://127.0.0.1:5175';
if(!['localhost','127.0.0.1','[::1]'].includes(new URL(baseUrl).hostname))throw Error('Local only');
const path='/private/tmp/richman-computer-gods-ui-'+route;fs.mkdirSync(path,{recursive:true});
const plan=JSON.parse(fs.readFileSync('/private/tmp/computer-gods-'+route+'.json','utf8'));
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
await button('新建对局').click();const dialog=page.getByRole('dialog');await dialog.getByLabel(/游戏模式/).selectOption('stockCircuit');await dialog.getByLabel(/对局种子/).fill(plan.replay.config.seed);await dialog.getByLabel(/每人初始资金/).selectOption(String(plan.replay.config.initialFunds));await dialog.getByLabel('开局日期').fill(plan.replay.config.startDate);
for(let i=0;i<4;i++)await dialog.getByRole('checkbox').nth(i).setChecked(i<count);
for(let i=0;i<count;i++)await dialog.locator('.rm-seat-controls select').nth(i).selectOption(plan.replay.control.computerIds.includes(plan.replay.config.characterIds[i])?'computer':'human');
await dialog.getByLabel('电脑策略',{exact:true}).selectOption('gods-v1');
await dialog.screenshot({path:path+'/setup.png'});await dialog.getByRole('button',{name:'开始新对局'}).click();
let offset=0,lifecycle=false,auto=0,human=0,effect='';const robotPreviews=[],crossChecks=[],toolWindows=[];const names={'card:22':'送神符','card:23':'请神符','card:24':'红卡','card:25':'黑卡','card:06':'转向卡','tool:05':'机车','tool:06':'汽车','tool:12':'工程车','tool:01':'机器娃娃','tool:02':'路障','tool:03':'地雷','tool:04':'定时炸弹','tool:07':'飞弹','card:09':'天使卡','card:10':'恶魔卡','card:11':'怪兽卡','card:07':'改建卡','card:08':'拍卖卡','card:27':'涨价卡','card:28':'查封卡','card:13':'抢夺卡','card:14':'停留卡','card:15':'冬眠卡','card:30':'乌龟卡','card:01':'均富卡','card:02':'均贫卡','card:26':'查税卡','tool:08':'遥控骰子','tool:09':'机器工人','card:03':'购地卡','card:04':'换地卡','card:05':'换屋卡','card:12':'拆除卡','card:16':'梦游卡','card:17':'陷害卡','card:19':'嫁祸卡','card:20':'免费卡','card:21':'免罪卡','card:29':'同盟卡'};
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
 if(a.type==='minigame')return page.locator('.rm-minigame').getByRole('button',{name:a.input.kind==='start'?/^开始/:a.input.kind==='ack'?'结算点数并返回':'退出小游戏，保留已得分'}).click();
 if(a.type==='auction')return button(a.increment===null?'退出竞价':'加价 '+a.increment.toLocaleString('en-US')).click();
 if(a.type==='reaction'){const p=page.getByRole('region',{name:'反应决策'}),name=(await p.innerText()).includes('· 免费卡')?'免费卡':'嫁祸卡';if(a.targetId)await p.getByRole('combobox').selectOption(a.targetId);return p.getByRole('button',{name:(a.choice==='use'?'使用':'不使用')+name,exact:true}).click();}
 if(a.type==='settleDebt')return button('确认支付现有资金并破产').click();

 if(a.type==='buyItem')return button('购买'+names[a.itemId]).click();
 if(a.type==='research'){const p=page.getByRole('region',{name:'研究生产'});await p.getByRole('combobox').selectOption(a.propertyId+'/'+a.itemId);return p.getByRole('button',{name:'确认开始研究'}).click();}
 if(a.type==='traffic')return page.getByRole('region',{name:'行动与交通',exact:true}).getByRole('combobox').selectOption(String(a.diceCount));
 if(a.type==='stockTrade'){const p=page.getByRole('region',{name:'股票市场'});await p.getByRole('combobox').nth(0).selectOption(a.stockId);await p.getByLabel('交易方向').selectOption(a.side);await p.getByLabel('股数').fill(String(a.quantity));return button(a.side==='buy'?'确认买入':'确认卖出').click();}
 if(a.type==='listProperty'){const p=page.getByRole('region',{name:'地产挂牌市场'});await p.getByLabel('挂牌地产',{exact:true}).selectOption(a.propertyId);await p.getByLabel('挂牌总价',{exact:true}).fill(String(a.price));return button('确认挂牌').click();}
 if(a.type==='buyListing'){const p=page.getByRole('group',{name:'挂牌 '+a.listingId,exact:true});await p.getByRole('button',{name:'购买挂牌',exact:true}).click();return p.getByRole('button',{name:'确认现金购买'}).click();}
 if(a.type==='item'){
  if(a.action.type==='begin'){effect=a.action.definitionId;return button('使用'+names[effect.slice(0,7)]).click();}
  if(a.action.type==='cancel')return button('取消使用').click();
  if(effect.startsWith('tool:01'))return button('确认清路').click();
  if(effect.startsWith('tool:02')){await page.getByLabel('目标路格',{exact:true}).selectOption(a.action.target.id);return button('确认放置路障').click();}
  if(effect.startsWith('tool:08')){await page.getByRole('radio',{name:`${a.value} 点`,exact:true}).check();return button('确认并出发').click();}
  if(effect.startsWith('tool:09')){const d=require('../../shared/richman/game/japan-properties.json').properties.find(p=>p.id===a.action.target.id);await page.getByRole('region',{name:'机器工人选择'}).getByRole('radio',{name:new RegExp(d.name+' · '+d.nodeIds.join(' / ')+' 号路格')}).check();return button('确认建造').click();}
  if(effect.startsWith('card:15'))return button('确认使用冬眠卡').click();
  if(effect.startsWith('card:01'))return button('确认使用均富卡').click();
  if(effect.startsWith('tool:05')||effect.startsWith('tool:06')||effect.startsWith('tool:12'))return button('确认使用'+names[effect.slice(0,7)]).click();
  const name=names[effect.slice(0,7)],p=page.getByRole('region',{name:name+'选择'});await p.getByRole('combobox').nth(0).selectOption(a.action.target.id);if(a.stolenItemId)await p.getByLabel('抢夺物品').selectOption(a.stolenItemId);if(a.value!==undefined)await p.getByLabel('改建类型').selectOption(String(a.value));return button('确认使用'+name).click();
 }
 throw Error('Unhandled UI '+a.type);
}
for(let i=0;i<plan.replay.commands.length;i++){
 const c=plan.replay.commands[i],a=c.action,isComputer=plan.replay.control.computerIds.includes(plan.replay.config.characterIds[Number(c.playerId.split('-')[1])-1]);
 await waitRevision(i+offset);
 const cross=plan.cross?.find(x=>x.index===i);
 if(cross&&!crossChecks.some(x=>x.kind===cross.kind&&x.computer===cross.computer)){
  assert.equal(await revision(),i+offset);const p=page.getByRole('region',{name:'电脑对手'});assert.equal(await p.getAttribute('data-computer-player'),c.playerId);assert.equal(await p.getAttribute('data-computer-active'),String(isComputer));assert.equal(await page.getByRole('group',{name:'当前决策操作'}).getAttribute('disabled')!==null,isComputer);const panel=page.getByRole('region',{name:cross.kind==='reaction'?'反应决策':cross.kind==='auction'?'地产拍卖':'地产与建设',exact:true});if(isComputer&&(cross.kind==='reaction'||cross.kind==='auction'))for(const b of await panel.getByRole('button').all())assert.equal(await b.isDisabled(),true);
  await button('暂停').click();offset++;const r=await revision();await page.waitForTimeout(900);assert.equal(await revision(),r);if(cross.kind==='reaction'||cross.kind==='auction')await panel.screenshot({path:path+'/cross-'+cross.kind+'-'+i+'.png'});else await page.screenshot({path:path+'/cross-'+cross.kind+'-'+i+'.png'});await button('继续旅程').click();offset++;await button('重新开始').click();offset++;await page.waitForTimeout(750);assert.equal(await revision(),i+offset);await page.keyboard.press('Escape');offset++;crossChecks.push(cross);
 }

 if(isComputer&&a.type==='item'&&a.action.type==='confirm'){
  const item=plan.replay.commands[i-1]?.action?.action?.definitionId?.slice(0,7);
  if(item&&!toolWindows.includes(item)){
   assert.equal(await revision(),i+offset);assert.equal(await page.getByRole('group',{name:'当前决策操作'}).getAttribute('disabled')!==null,true);
   assert.equal(await button(item==='tool:01'?'确认清路':item==='tool:02'?'确认放置路障':item==='tool:08'?'确认并出发':item==='tool:09'?'确认建造':'确认使用'+names[item]).isDisabled(),true);
   await button('暂停').click();offset++;const frozen=await revision();await page.waitForTimeout(850);assert.equal(await revision(),frozen);
   await page.getByRole('region',{name:'电脑对手'}).scrollIntoViewIfNeeded();if(item.startsWith('card:')||['tool:03','tool:04','tool:07'].includes(item)){assert.equal(await button('取消使用').isDisabled(),true);await page.getByRole('region',{name:names[item]+(item==='card:01'?'确认':'选择'),exact:true}).screenshot({path:path+'/card-'+item.slice(5)+'.png'});}else await page.screenshot({path:path+'/tool-'+item.slice(5)+'.png',fullPage:true});
   if(item==='tool:01'){const removed=plan.events.filter(e=>e.commandId===c.id&&e.type==='hazardChanged'&&e.reason==='机器娃娃清除');const mines=removed.filter(e=>e.hazard.itemId==='tool:03').length,bombs=removed.filter(e=>e.hazard.itemId==='tool:04').length;const panel=page.getByRole('region',{name:'机器娃娃选择',exact:true});if(removed.length){assert.ok((await panel.innerText()).includes(`${mines} 个地雷和 ${bombs} 个未携带炸弹`));assert.ok(!(await panel.innerText()).includes('当前路线没有障碍'));}await panel.screenshot({path:path+'/robot-preview.png'});robotPreviews.push({mines,bombs});}
   await button('继续旅程').click();offset++;
   await button('重新开始').click();offset++;await page.waitForTimeout(700);assert.equal(await revision(),i+offset);await page.keyboard.press('Escape');offset++;toolWindows.push(item);
  }
 }
 if(isComputer&&a.type!=='animationDone'&&!lifecycle){
  assert.equal(await revision(),i+offset);await button('暂停').click();offset++;const r=await revision();await page.waitForTimeout(1000);assert.equal(await revision(),r);assert.equal(await button('掷骰出发').isDisabled(),true);
  await button('全屏游戏').click();await page.waitForFunction(()=>!!document.fullscreenElement);await page.screenshot({path:path+'/paused-fullscreen.png'});await button('退出全屏').click();
  await page.setViewportSize({width:390,height:844});await page.getByRole('region',{name:'电脑对手'}).scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path+'/narrow.png'});await page.setViewportSize({width:1440,height:1080});
  await button('继续旅程').click();offset++;
  await button('重新开始').click();offset++;await page.waitForTimeout(850);assert.equal(await revision(),i+offset);await page.keyboard.press('Escape');offset++;
  lifecycle=true;
 }
 if(a.type==='animationDone'||(a.type==='minigame'&&a.input.kind==='tick')||isComputer){if(a.type!=='animationDone')auto++;await waitRevision(i+offset+1);}
 else{assert.equal(await revision(),i+offset);human++;await act(a);await waitRevision(i+offset+1);}
 if(i%100===0)console.log(count,'UI',i,'/',plan.replay.commands.length);
 if((await page.getByRole('region',{name:'电脑对手'}).innerText()).includes('已停止自动操作'))throw Error('Computer stopped');
}
assert.ok(lifecycle&&auto&&human);assert.equal(await revision(),plan.replay.commands.length+offset);
if(plan.state.phase==='finished'){await page.getByRole('region',{name:'对局结果'}).waitFor();assert.equal(await viewport.getAttribute('data-phase'),'finished');if(await button('掷骰出发').count())assert.equal(await button('掷骰出发').isDisabled(),true);const r=await revision();await page.waitForTimeout(1100);assert.equal(await revision(),r);await page.getByRole('region',{name:'对局结果'}).screenshot({path:path+'/winner.png'});}
await page.screenshot({path:path+'/final.png'});await page.locator('.rm-diagnostics summary').click();const download=page.waitForEvent('download');await button('下载回放记录').click();await(await download).saveAs(path+'/replay.json');const replay=JSON.parse(fs.readFileSync(path+'/replay.json','utf8'));assert.deepEqual(replay.control,plan.replay.control);
// Reset invalidates old work and preserves control, then replacing with humans must not autoplay.
await button('重新开始').click();await page.getByRole('dialog').getByRole('button',{name:'确认重新开始'}).click();assert.equal(await revision(),0);await page.waitForTimeout(800);assert.equal(await revision(),0);
await button('新建对局').click();for(let i=0;i<count;i++)await page.getByRole('dialog').locator('.rm-seat-controls select').nth(i).selectOption('human');await page.getByRole('dialog').getByRole('button',{name:'开始新对局'}).click();await page.waitForTimeout(900);assert.equal(await revision(),0);assert.equal(await page.getByRole('region',{name:'电脑对手'}).count(),0);
// Leave while an all-computer decision is queued, rather than only from an idle human game.
await button('新建对局').click();for(let i=0;i<count;i++)await page.getByRole('dialog').locator('.rm-seat-controls select').nth(i).selectOption('computer');await page.getByRole('dialog').getByLabel('电脑策略',{exact:true}).selectOption('gods-v1');await page.getByRole('dialog').getByRole('button',{name:'开始新对局'}).click();
await button('新建对局').click();const frozen=await revision();await page.waitForTimeout(900);assert.equal(await revision(),frozen);for(let i=0;i<count;i++)await page.getByRole('dialog').locator('.rm-seat-controls select').nth(i).selectOption('human');await page.getByRole('dialog').getByRole('button',{name:'开始新对局'}).click();await page.waitForTimeout(900);assert.equal(await revision(),0);
await button('新建对局').click();for(let i=0;i<count;i++)await page.getByRole('dialog').locator('.rm-seat-controls select').nth(i).selectOption('computer');await page.getByRole('dialog').getByLabel('电脑策略',{exact:true}).selectOption('gods-v1');await page.getByRole('dialog').getByRole('button',{name:'开始新对局'}).click();await page.getByRole('link',{name:'模块集合',exact:true}).click();await page.waitForTimeout(900);const cleanup=await page.evaluate(()=>window.__richmanProbe());assert.deepEqual(cleanup,{raf:0,canvas:0});assert.deepEqual(errors,[]);
const report={robotPreviews,policy:plan.replay.control.policy,toolWindows,crossChecks,route,terminal:plan.state.phase==='finished',players:count,normalSpeed:true,map:'original Japan; actual human UI and session computer commands; auth fixture only',commands:replay.commands.length,auto,human,lifecycle:['pause stops waiting','resume','reset dialog cancel','reset','replace with humans','exit cleanup','fullscreen','390px'],cleanup,errors};fs.writeFileSync(path+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();
})().catch(async e=>{console.error(e);if(livePage){try{const pause=livePage.getByRole('button',{name:'暂停',exact:true});if(await pause.isEnabled())await pause.click();}catch{}try{await livePage.screenshot({path:path+'/failure.png'});const details=livePage.locator('.rm-diagnostics');if(!await details.getAttribute('open'))await details.locator('summary').click();const d=livePage.waitForEvent('download');await livePage.getByRole('button',{name:'下载回放记录',exact:true}).click();await(await d).saveAs(path+'/failure-replay.json');}catch{}}if(liveBrowser)await liveBrowser.close();process.exitCode=1;});
