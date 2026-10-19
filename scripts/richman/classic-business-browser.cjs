/** UI-05: real route inventory/stock actions, plus explicitly isolated presentation fixtures. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const base=process.env.RICHMAN_TEST_BASE_URL||'http://127.0.0.1:5174',output=process.env.RICHMAN_TEST_OUTPUT||'/private/tmp/richman-ui05';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local validation only');
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1440,height:1080}}),errors=[];
 const user={id:'richman-validation',username:'validation',displayName:'技术验证',inviteCode:'VALIDATION',invitedByUserId:null,status:'active',createdAt:'2026-10-19T00:00:00.000Z'};
 await context.route(base+'/api/**',route=>route.fulfill(route.request().url().endsWith('/users/me')?{json:{success:true,data:{user}}}:{status:404,json:{success:false}}));
 await context.addInitScript(user=>localStorage.setItem('home-assistant.session.v1',JSON.stringify({user,tokens:{accessToken:'browser-test-only',refreshToken:'browser-test-only',tokenType:'Bearer',accessExpiresIn:3600,refreshExpiresIn:7200},accessExpiresAt:Date.now()+3600000,refreshExpiresAt:Date.now()+7200000})),user);
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 const capture=async name=>{await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.screenshot({path:output+'/'+name+'.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);};
 try {
 await page.goto(base+'/modules/richman');await page.locator('.rm-system-dialog').getByRole('button',{name:'继续当前对局'}).click();await page.getByRole('button',{name:'掷骰出发',exact:true}).waitFor();
 await page.locator('.rm-game-toolbar').getByRole('button',{name:'新建对局',exact:true}).click();
 const setup=page.getByRole('dialog',{name:'开启一场新旅程'});
 await setup.getByText('高级设置 · 历史模式、电脑策略与种子',{exact:true}).click();await setup.getByLabel(/游戏模式/).selectOption('surrender');await setup.getByLabel(/对局种子/).fill('ui05-business');
 await setup.locator('input[type="date"]').fill('1998-01-07');
 await setup.getByRole('button',{name:'开始新对局'}).click();
 const host=page.locator('[data-window-host]'),toolbar=page.getByRole('navigation',{name:'原版工具栏'});
 const revision=await page.getByTestId('richman-viewport').getAttribute('data-revision');
 await toolbar.getByRole('button',{name:'道具',exact:true}).click();
 assert.equal(await host.getByRole('button',{name:'使用遥控骰子'}).isVisible(),true);
 assert.equal(await host.getByRole('button',{name:'使用均富卡'}).count(),0);
 await capture('inventory-tools-desktop');await host.getByRole('button',{name:'关闭窗口'}).click();
 await toolbar.getByRole('button',{name:'卡片',exact:true}).click();
 assert.equal(await host.getByRole('button',{name:'使用均富卡'}).isVisible(),true);await capture('inventory-cards-desktop');
 await page.setViewportSize({width:390,height:844});await capture('inventory-mobile');
 await host.getByRole('button',{name:'关闭窗口'}).click();await page.setViewportSize({width:1440,height:1080});
 assert.equal(await page.getByTestId('richman-viewport').getAttribute('data-revision'),revision);
 await toolbar.getByRole('button',{name:'股票',exact:true}).click();
 const stock=host.getByRole('region',{name:'股票市场'});await stock.getByLabel(/^股数/).fill('2');
 await stock.getByRole('button',{name:'确认买入',exact:true}).click();await stock.getByRole('status').filter({hasText:'交易完成'}).waitFor();
 await stock.getByLabel('交易方向').selectOption('sell');await stock.getByLabel(/^股数/).fill('1');await stock.getByRole('button',{name:'确认卖出',exact:true}).click();
 await capture('stock-desktop');await page.setViewportSize({width:390,height:844});await stock.locator('form').scrollIntoViewIfNeeded();await capture('stock-mobile');
 await page.setViewportSize({width:1440,height:1080});await host.getByRole('button',{name:'关闭窗口'}).click();
 await toolbar.getByRole('button',{name:'地产出售',exact:true}).click();assert.equal(await host.getByRole('button',{name:'股票 · 暂未接入'}).isDisabled(),true);await capture('sale-desktop');await host.getByRole('button',{name:'关闭窗口'}).click();
 await page.getByRole('button',{name:'更多功能',exact:true}).click();await host.getByRole('button',{name:'运行信息与验证工具',exact:true}).click();
 const download=page.waitForEvent('download');await host.getByRole('button',{name:'下载回放记录'}).click();await(await download).saveAs(output+'/replay.json');
 const replay=JSON.parse(fs.readFileSync(output+'/replay.json','utf8'));
 assert.deepEqual(replay.commands.map(c=>c.action).filter(a=>a.type==='stockTrade').map(a=>[a.side,a.quantity]),[['buy',2],['sell',1]]);
 await host.getByRole('button',{name:'关闭窗口'}).click();
 // Never mutate the running game. A separate React root renders static fixtures to verify rare UI layouts.
 if(process.env.RICHMAN_BUILT_SMOKE!=='1'){
 await page.evaluate(async()=>{
  const React=(await import('/node_modules/.vite/deps/react.js')).default,{createRoot}=(await import('/node_modules/.vite/deps/react-dom_client.js')).default;
  const {GameSession}=await import('/src/features/richman/game/session.ts');
  const manifest=await(await fetch('/richman/generated/manifest.json')).json();
  const session=new GameSession(manifest,{id:()=> 'ui05-fixture',seed:()=> 'ui05-fixture'},'surrender');session.start({mode:'surrender',seed:'ui05-fixture',characterIds:manifest.characters.slice(0,2).map(c=>c.id),startDate:'1998-01-07'});
  const components={};for(const name of ['ShopAcquisitionPanel','LotteryPanel','InsurancePanel','CommercePanel','CompanyPanel','SiteServicesPanel','G5Panel'])Object.assign(components,await import('/src/features/richman/'+name+'.tsx'));
  const element=document.createElement('div');document.body.append(element);const root=createRoot(element);document.getElementById('root').style.display='none';
  window.ui05={calls:[],render:(kind)=>{
   const s=structuredClone(session.snapshot());let Component,props;const call=(...a)=>{window.ui05.calls.push(a);return true};
   if(kind==='shop'){s.items.points['player-1']=100;s.shopDecision={kind:'shop',id:'fixture-shop',node:50,companyId:'japan:company:1',turnover:0,sales:[],shelf:{cards:[{itemId:'card:06',available:true},{itemId:'card:06',available:true}],tools:[{itemId:'tool:08',available:true},{itemId:'tool:01',available:false}],gift:null}};s.shopSales=[];Component=components.ShopAcquisitionPanel;props={buy:call,sell:call,leave:call};}
   if(kind==='lottery'){s.lotteryDecision={kind:'lottery',id:'fixture-ticket',node:88};s.lottery.tickets[0]='player-2';Component=components.LotteryPanel;props={buy:call,leave:call};}
  if(kind==='insurance'){s.insuranceDecision={kind:'insurance',id:'fixture-insurance',companyId:'japan:company:4',ownerId:'player-2'};Component=components.InsurancePanel;props={spin:call};}
   if(kind==='commerce'){s.commerceDecision={kind:'subscription',id:'fixture-subscription',companyId:'japan:company:3',name:'日产',price:24,available:100,maximum:10};Component=components.CommercePanel;props={construct:call,subscribe:call,locate:call};}
   if(kind==='company'){s.companyDecision={kind:'company',id:'fixture-company',receipt:{kind:'companyFee',companyId:'japan:company:2',name:'丰田汽车',node:59,visitorId:'player-1',ownerId:'player-2',payerId:'player-1',base:2100,amount:2100,factor:1,dice:3,days:8,reason:'700 × 1 × 3',free:false,redirected:false,godPayer:false,cash:2100,bank:0,paid:2100,unpaid:0,bankrupt:false,fundsBefore:0,fundsAfter:2100,cumulativeBefore:0,cumulativeAfter:2100}};Component=components.CompanyPanel;props={ack:call};}
   if(kind==='research'){s.researchChoices=[{propertyId:'fixture-property',itemId:'tool:09',title:'研究所 · 机器工人'}];Component=components.ResearchPanel;props={start:call};}
   if(kind==='prison'||kind==='hospital'){s.facilityDecision={kind:'facility',id:'fixture-facility',facility:kind,node:12,targets:['player-2'],helped:[]};s.items.points['player-1']=100;s.g2.players['player-2'][kind]=5;Component=components.FacilityPanel;props={act:call};}
   root.render(React.createElement('main',{className:'rm-page rm-classic-page'},React.createElement('dialog',{open:true,className:'rm-game-window','data-panel':kind==='shop'?'items':kind},React.createElement('header',{className:'rm-window-header'},'UI-05 独立展示测试 · '+kind),React.createElement('div',{className:'rm-window-body'},React.createElement(Component,{...props,snapshot:s,key:kind})))));
  }};
 });
 for(const kind of ['shop','lottery','insurance','commerce','company','research','prison','hospital']){
  await page.evaluate(kind=>window.ui05.render(kind),kind);await page.locator(`dialog[open][data-panel="${kind==='shop'?'items':kind}"] .rm-property`).waitFor();
  if(kind==='shop'){await page.getByRole('button',{name:'购买转向卡'}).click();await page.getByRole('button',{name:'卡片',exact:true}).click();await capture('shop-cards-desktop');await page.getByRole('button',{name:'道具',exact:true}).click();assert.equal(await page.getByRole('button',{name:'购买机器娃娃'}).isDisabled(),true);}
  if(kind==='lottery'){await page.getByRole('button',{name:'36号',exact:true}).click();assert.equal(await page.getByLabel('彩票号码',{exact:true}).inputValue(),'36');await page.getByRole('button',{name:'确认购彩'}).click();}
  if(kind==='research'){await page.getByRole('button',{name:'研究所 · 机器工人'}).click();await page.getByRole('button',{name:'确认开始研究'}).click();}
  if(kind==='company')await page.getByRole('button',{name:'确认营业结算'}).click();
  if(kind==='insurance')await page.getByRole('button',{name:'转动保险转盘'}).click();
  if(kind==='commerce'){await page.getByLabel('认股数量').fill('10');await page.getByRole('button',{name:'确认现金认股'}).click();}
  if(kind==='prison'||kind==='hospital'){await page.getByRole('button',{name:'选择玩家 2'}).click();assert.equal(await page.getByLabel('帮助对象').inputValue(),'player-2');await page.getByRole('button',{name:'确认支付 30 点'}).click();}
  await capture(kind+'-desktop');await page.setViewportSize({width:390,height:844});await capture(kind+'-mobile');
  if(kind==='lottery'){const heights=await page.getByRole('group',{name:'彩票号码板'}).getByRole('button').evaluateAll(bs=>bs.map(b=>b.getBoundingClientRect().height));assert.ok(heights.every(h=>h>=44));}
  await page.setViewportSize({width:1440,height:1080});
 }
 const calls=await page.evaluate(()=>window.ui05.calls);assert.deepEqual(calls,[['fixture-shop','card:06'],['fixture-ticket',36],['fixture-insurance'],['fixture-subscription',10],['fixture-company'],['fixture-property','tool:09'],['fixture-facility','player-2'],['fixture-facility','player-2']]);
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(output+'/results.json',JSON.stringify({realRoute:['tools/cards category without revision change','stock buy 2/sell 1','sales unavailable entries','desktop/mobile'],fixtures:process.env.RICHMAN_BUILT_SMOKE==='1'?[]:['shop','lottery','insurance','subscription','company','research','prison','hospital'],errors},null,2));console.log('UI-05 browser checks passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
