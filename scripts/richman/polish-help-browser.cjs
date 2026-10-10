/** S3-05a short original-map UI check. Auth fixture only; no world injection. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const base=process.env.RICHMAN_BASE_URL||'http://127.0.0.1:5177';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('local only');
const output='/private/tmp/richman-polish-help';fs.mkdirSync(output,{recursive:true});
const user={id:'richman-validation',username:'validation',displayName:'技术验证',inviteCode:'VALIDATION',invitedByUserId:null,status:'active',createdAt:'2026-09-28T00:00:00.000Z'};
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});try{
 const rows=[];
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},hasTouch:mobile,isMobile:mobile});
  await context.addInitScript(user=>localStorage.setItem('home-assistant.session.v1',JSON.stringify({user,tokens:{accessToken:'browser-test-only',refreshToken:'browser-test-only',tokenType:'Bearer',accessExpiresIn:3600,refreshExpiresIn:7200},accessExpiresAt:Date.now()+3600000,refreshExpiresAt:Date.now()+7200000})),user);
  await context.route(base+'/api/**',r=>r.request().url().endsWith('/users/me')?r.fulfill({json:{success:true,data:{user}}}):r.fulfill({status:404,json:{success:false}}));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/modules/richman');
  const b=name=>page.getByRole('button',{name,exact:true}),act=async locator=>mobile?locator.tap():locator.click();
  await b('使用机器工人').waitFor();
  await act(page.getByText('玩法与操作帮助',{exact:true}));
  assert.ok(await page.getByText(/本局物价随日期/).isVisible());
  assert.ok(await page.getByText('三井保险服务见保险面板。',{exact:false}).count());
  assert.equal(await page.getByText('三井保险服务尚未接入。',{exact:false}).count(),0);
  assert.ok((await page.getByLabel('节日与物价').innerText()).includes('地产购买/建造/租金'));
  await act(b('全屏游戏'));await page.waitForFunction(()=>!!document.fullscreenElement);
  const nativeFullscreen=await page.evaluate(()=>!!document.fullscreenElement);
  await act(b('退出全屏'));await page.waitForFunction(()=>!document.fullscreenElement);
  const zoomBefore=await page.locator('.rm-map-controls span').innerText();await act(b('放大地图'));await page.waitForTimeout(300);
  const zoomAfter=await page.locator('.rm-map-controls span').innerText();assert.notEqual(zoomAfter,zoomBefore);await act(b('跟随当前角色'));
  const touchTarget=await b('放大地图').boundingBox();if(mobile)assert.ok(touchTarget.width>=44&&touchTarget.height>=44);
  await act(b('使用机器工人'));const worker=page.getByRole('region',{name:'机器工人选择'});
  assert.ok(await worker.getByText('请先在地图或列表选择一块地，再确认建造。').isVisible());assert.ok(await worker.getByRole('button',{name:'确认建造'}).isDisabled());
  await act(worker.getByRole('radio').first());assert.ok(await worker.getByText(/已选择：/).isVisible());assert.ok(await worker.getByRole('button',{name:'确认建造'}).isEnabled());
  await act(worker.getByRole('button',{name:'定位所选地块'}));
  await act(b('暂停'));assert.ok(await worker.getByRole('button',{name:'确认建造'}).isDisabled());await act(b('继续旅程'));
  await act(worker.getByRole('button',{name:'取消使用'}));assert.equal(await worker.count(),0);
  await act(b('使用机器工人'));assert.ok(await worker.getByRole('button',{name:'确认建造'}).isDisabled());await act(worker.getByRole('button',{name:'取消使用'}));
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);assert.equal(overflow,false);
  await page.getByText('玩法与操作帮助',{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:output+`/${mobile?'touch390':'desktop'}.png`});
  await act(page.locator('summary').filter({hasText:'运行信息与验证工具'}));const download=page.waitForEvent('download');await act(b('下载回放记录'));await(await download).saveAs(output+`/${mobile?'touch390':'desktop'}-replay.json`);
  // Historical-mode text stays scoped after switching via the real new-game dialog.
  await act(b('新建对局'));const dialog=page.getByRole('dialog');await dialog.getByLabel(/游戏模式/).selectOption('economy');await act(dialog.getByRole('button',{name:'开始新对局'}));
  assert.ok(await page.getByText(/本局沿用固定物价/).count());assert.equal(await page.getByRole('region',{name:'日产建造与现场认股'}).count(),0);
  await page.getByRole('link',{name:'模块集合',exact:true}).click();await page.waitForURL(base+'/');await page.waitForFunction(()=>document.querySelectorAll('canvas').length===0);assert.equal(await page.locator('canvas').count(),0);assert.deepEqual(errors,[]);
  rows.push({mobile,viewport:mobile?'390x844':'1440x1000',nativeFullscreen,zoomBefore,zoomAfter,touchTarget,overflow,worker:'select/locate/pause/resume/cancel/reopen clears selection',historicalEconomyHelp:true,exitCanvas:0,errors});await context.close();
 }
 fs.writeFileSync(output+'/results.json',JSON.stringify({scope:'real UI on original map; desktop and Chrome touch emulation, not physical mobile/Safari',rows},null,2));console.log(JSON.stringify(rows));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
