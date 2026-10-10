/** S3-05b: short real worker entry on original map, no game-state injection. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const base=process.env.RICHMAN_BASE_URL||'http://127.0.0.1:5177';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('local only');
const output='/private/tmp/richman-polish-navigation';fs.mkdirSync(output,{recursive:true});
const user={id:'richman-validation',username:'validation',displayName:'技术验证',inviteCode:'VALIDATION',invitedByUserId:null,status:'active',createdAt:'2026-09-28T00:00:00.000Z'};
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});try{
 const rows=[];
 for(const mobile of [false]){
  const name='ownership',context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},hasTouch:mobile,isMobile:mobile});
  await context.addInitScript(user=>localStorage.setItem('home-assistant.session.v1',JSON.stringify({user,tokens:{accessToken:'browser-test-only',refreshToken:'browser-test-only',tokenType:'Bearer',accessExpiresIn:3600,refreshExpiresIn:7200},accessExpiresAt:Date.now()+3600000,refreshExpiresAt:Date.now()+7200000})),user);
  await context.route(base+'/api/**',r=>r.request().url().endsWith('/users/me')?r.fulfill({json:{success:true,data:{user}}}):r.fulfill({status:404,json:{success:false}}));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/modules/richman');
  const b=name=>page.getByRole('button',{name,exact:true}),act=async l=>mobile?l.tap():l.click(),canvas=page.locator('.rm-viewport canvas'),worker=page.getByRole('region',{name:'机器工人选择'});
  await b('使用机器工人').waitFor();
  await b('新建对局').click();const dialog=page.getByRole('dialog');
  const boxes=dialog.getByRole('checkbox');await boxes.nth(3).uncheck();await boxes.nth(2).uncheck();
  const seats=dialog.locator('.rm-seat-controls select');for(let i=0;i<await seats.count();i++)await seats.nth(i).selectOption('computer');
  await dialog.getByLabel('电脑策略',{exact:true}).selectOption('tools-v1');await dialog.getByPlaceholder('留空自动生成').fill('navigation-ownership');await dialog.getByRole('button',{name:'开始新对局'}).click();
  await b('查看全图').click();await worker.waitFor({timeout:60000});
  assert.equal(await page.getByRole('region',{name:'电脑对手'}).getAttribute('data-computer-active'),'true');
  assert.ok(await worker.getByRole('radio').first().isDisabled());
  const box=await canvas.boundingBox();await page.mouse.click(box.x+30,box.y+box.height-70);
  assert.equal(await page.locator('.rm-map-feedback').count(),0);assert.equal(await worker.locator('label.is-selected').count(),0);
  await b('暂停').evaluate(el=>el.click());await page.screenshot({path:output+'/ownership.png'});
  const pausedRevision=await page.getByTestId('richman-viewport').getAttribute('data-revision');await page.waitForTimeout(800);assert.equal(await page.getByTestId('richman-viewport').getAttribute('data-revision'),pausedRevision);
  await page.locator('summary').filter({hasText:'运行信息与验证工具'}).click();const dl=page.waitForEvent('download');await b('下载回放记录').click();await(await dl).saveAs(output+'/ownership-replay.json');
  await page.getByRole('link',{name:'模块集合',exact:true}).click();await page.waitForURL(base+'/');await page.waitForFunction(()=>document.querySelectorAll('canvas').length===0);assert.deepEqual(errors,[]);
  rows.push({name,originalMap:true,automaticWorker:true,radioDisabled:true,mapMissFeedbackSuppressed:true,noHumanTargetSelection:true,pauseFrozen:true,exitCanvas:0,errors});await context.close();
 }
 fs.writeFileSync(output+'/ownership-results.json',JSON.stringify(rows,null,2));console.log(JSON.stringify(rows));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
