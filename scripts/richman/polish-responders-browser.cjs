/** S3-05c: original-map targeted interaction checks; authentication fixture only. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const base=process.env.RICHMAN_BASE_URL||'http://127.0.0.1:5177';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('local only');
const output='/private/tmp/richman-polish-responders';fs.mkdirSync(output,{recursive:true});
const user={id:'richman-validation',username:'validation',displayName:'技术验证',inviteCode:'VALIDATION',invitedByUserId:null,status:'active',createdAt:'2026-09-28T00:00:00.000Z'};
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});try{
 const rows=[];
 for(const route of (process.env.RICHMAN_ROUTES||'auction,reaction').split(',')){
  const mobile=false,name=route,plan=JSON.parse(fs.readFileSync('/private/tmp/s3-05c-'+route+'-plan.json','utf8')),context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},hasTouch:mobile,isMobile:mobile});
  await context.addInitScript(user=>localStorage.setItem('home-assistant.session.v1',JSON.stringify({user,tokens:{accessToken:'browser-test-only',refreshToken:'browser-test-only',tokenType:'Bearer',accessExpiresIn:3600,refreshExpiresIn:7200},accessExpiresAt:Date.now()+3600000,refreshExpiresAt:Date.now()+7200000})),user);
  await context.route(base+'/api/**',r=>r.request().url().endsWith('/users/me')?r.fulfill({json:{success:true,data:{user}}}):r.fulfill({status:404,json:{success:false}}));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/modules/richman');
  const b=name=>page.getByRole('button',{name,exact:true}),canvas=page.locator('.rm-viewport canvas'),worker=page.getByRole('region',{name:'机器工人选择'});
  await b('使用机器工人').waitFor();
  const button=b,viewport=page.getByTestId('richman-viewport');let effect='';const names={'tool:08':'遥控骰子','tool:09':'机器工人','card:19':'嫁祸卡'};
  await b('新建对局').click();const dialog=page.getByRole('dialog');await dialog.getByLabel(/游戏模式/).selectOption(plan.mode);await dialog.getByPlaceholder('留空自动生成').fill(plan.replay.config.seed);await dialog.getByLabel(/每人初始资金/).selectOption(String(plan.replay.config.initialFunds));
  for(let i=0;i<4;i++)await dialog.getByRole('checkbox').nth(i).setChecked(i<plan.replay.config.characterIds.length);await dialog.getByRole('button',{name:'开始新对局'}).click();
  async function waitRevision(n){await page.waitForFunction(n=>Number(document.querySelector('[data-testid="richman-viewport"]').dataset.revision)>=n,n,{timeout:30000});}
async function act(a){
 if(a.type==='pause')return button(a.value?'暂停':'继续旅程').click();
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
 if(a.type==='magic'){const p=page.getByRole('region',{name:'魔法屋'});return p.getByRole('button',{name:a.effect===2?'坐牢三回合':a.effect===5?'就地加盖一层':a.effect===6?'得一张卡片':await p.getByRole('button',{name:'抽取魔法目标'}).count()?'抽取魔法目标':'继续回合',exact:true}).click();}
 if(a.type==='magicBuild')return page.getByRole('region',{name:'魔法屋'}).getByRole('button',{name:['公园','大饭店','购物中心','加油站','研究所'][a.buildingType],exact:true}).click();
 if(a.type==='minigame')return page.locator('.rm-minigame').getByRole('button',{name:a.input.kind==='start'?/^开始/:a.input.kind==='ack'?'结算点数并返回':'退出小游戏，保留已得分'}).click();
 if(a.type==='auction')return button(a.increment===null?'退出竞价':'加价 '+a.increment.toLocaleString('en-US')).click();
 if(a.type==='reaction'){const p=page.getByRole('region',{name:'反应决策'}),name=(await p.innerText()).includes('· 免费卡')?'免费卡':'嫁祸卡';if(a.targetId)await p.getByRole('combobox').selectOption(a.targetId);return p.getByRole('button',{name:(a.choice==='use'?'使用':'不使用')+name,exact:true}).click();}
 if(a.type==='settleDebt')return button('确认支付现有资金并破产').click();

 if(a.type==='buyItem')return button('购买'+names[a.itemId]).click();
 if(a.type==='traffic')return page.getByRole('region',{name:'行动与交通',exact:true}).getByRole('combobox').selectOption(String(a.diceCount));
 if(a.type==='stockTrade'){const p=page.getByRole('region',{name:'股票市场'});await p.getByRole('combobox').nth(0).selectOption(a.stockId);await p.getByLabel('交易方向').selectOption(a.side);await p.getByLabel('股数').fill(String(a.quantity));return button(a.side==='buy'?'确认买入':'确认卖出').click();}
 if(a.type==='listProperty'){const p=page.getByRole('region',{name:'地产挂牌市场'});await p.getByLabel('挂牌地产',{exact:true}).selectOption(a.propertyId);await p.getByLabel('挂牌总价',{exact:true}).fill(String(a.price));return button('确认挂牌').click();}
 if(a.type==='buyListing'){const p=page.getByRole('group',{name:'挂牌 '+a.listingId,exact:true});await p.getByRole('button',{name:'购买挂牌',exact:true}).click();return p.getByRole('button',{name:'确认现金购买'}).click();}
 if(a.type==='item'){
  if(a.action.type==='begin'){effect=a.action.definitionId;return button('使用'+names[effect.slice(0,7)]).click();}
  if(a.action.type==='cancel')return button('取消使用').click();
  if(effect.startsWith('tool:08')){await page.getByRole('radio',{name:`${a.value} 点`,exact:true}).check();return button('确认并出发').click();}
  if(effect.startsWith('tool:09')){const d=require('../../shared/richman/game/japan-properties.json').properties.find(p=>p.id===a.action.target.id);await page.getByRole('region',{name:'机器工人选择'}).getByRole('radio',{name:new RegExp(d.name+' · '+d.nodeIds.join(' / ')+' 号路格')}).check();return button('确认建造').click();}
  const name=names[effect.slice(0,7)],p=page.getByRole('region',{name:name+'选择'});await p.getByRole('combobox').nth(0).selectOption(a.action.target.id);return button('确认使用'+name).click();
 }
 throw Error('Unhandled UI '+a.type);
}

  const checks=[];
  for(let i=0;i<plan.replay.commands.length;i++){
   await waitRevision(i);assert.equal(Number(await viewport.getAttribute('data-revision')),i);const target=plan.targets.find(t=>t.index===i);
   if(target){const label=route==='auction'?'地产拍卖':'反应决策';await b('当前操作').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),label);await page.keyboard.press('Tab');assert.equal(await page.evaluate(label=>!!document.activeElement.closest('[aria-label="'+label+'"]'),label),true);assert.equal(Number(await viewport.getAttribute('data-revision')),i);await page.screenshot({path:output+`/${name}-${i}.png`});if(route==='reaction'){await page.setViewportSize({width:390,height:844});await b('当前操作').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:output+'/reaction-390.png'});}checks.push({...target,label,tabWithinPanel:true,navigationNoCommand:true});}
   const a=plan.replay.commands[i].action;if(a.type!=='animationDone')await act(a);await waitRevision(i+1);if(target){await page.waitForFunction(()=>document.activeElement!==document.body);checks.at(-1).focusAfterResponse=await page.evaluate(()=>document.activeElement.getAttribute('aria-label')||document.activeElement.className);}
   if(i%50===0)console.log(name,i,'/',plan.replay.commands.length);
  }
  await page.locator('.rm-diagnostics summary').click();const dl=page.waitForEvent('download');await b('下载回放记录').click();await(await dl).saveAs(output+`/${name}-replay.json`);
  await page.getByRole('link',{name:'模块集合',exact:true}).click();await page.waitForURL(base+'/');await page.waitForFunction(()=>document.querySelectorAll('canvas').length===0);assert.deepEqual(errors,[]);rows.push({name,source:plan.source,mode:plan.mode,checks,errors});fs.writeFileSync(output+'/'+name+'-results.json',JSON.stringify(rows.at(-1),null,2));await context.close();
 }
 fs.writeFileSync(output+'/results.json',JSON.stringify(rows,null,2));console.log(JSON.stringify(rows));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
