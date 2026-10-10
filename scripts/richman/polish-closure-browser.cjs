/** S3-05c: original-map targeted interaction checks; authentication fixture only. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const base=process.env.RICHMAN_BASE_URL||'http://127.0.0.1:5177';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('local only');
const output='/private/tmp/richman-polish-closure';fs.mkdirSync(output,{recursive:true});
const user={id:'richman-validation',username:'validation',displayName:'技术验证',inviteCode:'VALIDATION',invitedByUserId:null,status:'active',createdAt:'2026-09-28T00:00:00.000Z'};
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});try{
 const rows=[];
 for(const mobile of [false,true]){
  const name=mobile?'touch390':'desktop',context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},hasTouch:mobile,isMobile:mobile});
  await context.addInitScript(user=>localStorage.setItem('home-assistant.session.v1',JSON.stringify({user,tokens:{accessToken:'browser-test-only',refreshToken:'browser-test-only',tokenType:'Bearer',accessExpiresIn:3600,refreshExpiresIn:7200},accessExpiresAt:Date.now()+3600000,refreshExpiresAt:Date.now()+7200000})),user);
  await context.route(base+'/api/**',r=>r.request().url().endsWith('/users/me')?r.fulfill({json:{success:true,data:{user}}}):r.fulfill({status:404,json:{success:false}}));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/modules/richman');
  const b=name=>page.getByRole('button',{name,exact:true}),act=async l=>mobile?l.tap():l.click(),canvas=page.locator('.rm-viewport canvas'),worker=page.getByRole('region',{name:'机器工人选择'});
  await b('使用机器工人').waitFor();
  const keyboard=async name=>{await b(name).focus();await page.keyboard.press('Enter')};
  await keyboard('使用机器工人');await keyboard('当前操作');assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'机器工人选择');
  await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.type),'radio');await page.keyboard.press('Space');
  assert.equal(await worker.getByRole('radio',{checked:true}).count(),1);await keyboard('取消使用');
  assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('rm-action-bar')),true,'removed worker focus must move to next operation');
  const save=async suffix=>{const d=page.locator('.rm-diagnostics');if(await d.getAttribute('open')===null)await d.locator('summary').click();const dl=page.waitForEvent('download');await b('下载回放记录').click();await(await dl).saveAs(output+`/${name}-${suffix}-replay.json`)};
  await keyboard('使用机器工人');await keyboard('当前操作');await page.keyboard.press('Tab');await page.keyboard.press('Space');
  const selected=await worker.locator('label.is-selected').innerText();
  await keyboard('重新开始');await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>document.activeElement.textContent),'重新开始');assert.equal(await worker.locator('label.is-selected').innerText(),selected);assert.ok(await worker.getByRole('button',{name:'确认建造'}).isEnabled());
  await keyboard('新建对局');await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'新建对局');assert.equal(await worker.locator('label.is-selected').innerText(),selected);
  await keyboard('暂停');await keyboard('新建对局');await page.getByRole('dialog').getByRole('button',{name:'取消',exact:true}).click();assert.ok(await b('继续旅程').isVisible());assert.ok(await worker.getByRole('button',{name:'确认建造'}).isDisabled());await keyboard('继续旅程');
  await save('before-reset');
  await keyboard('重新开始');await page.getByRole('dialog').getByRole('button',{name:'确认重新开始'}).focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.activeElement.classList.contains('rm-action-bar'));assert.equal(await page.getByTestId('richman-viewport').getAttribute('data-revision'),'0');
  await keyboard('使用机器工人');assert.equal(await worker.getByRole('radio',{checked:true}).count(),0);assert.ok(await worker.getByRole('button',{name:'确认建造'}).isDisabled());await keyboard('取消使用');
  await save('after-reset');
  await keyboard('使用机器工人');await keyboard('当前操作');await page.keyboard.press('Tab');await page.keyboard.press('Space');
  await keyboard('新建对局');const dialog=page.getByRole('dialog');await dialog.getByPlaceholder('留空自动生成').fill('polish-closure-'+name);await dialog.getByRole('checkbox').nth(3).uncheck();await dialog.getByRole('checkbox').nth(2).uncheck();await dialog.getByRole('button',{name:'开始新对局'}).focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.activeElement.classList.contains('rm-action-bar'));await keyboard('使用机器工人');assert.equal(await worker.getByRole('radio',{checked:true}).count(),0);assert.equal(await page.locator('.rm-map-feedback').count(),0);await keyboard('取消使用');
  await keyboard('当前操作');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent.includes('掷骰出发')),true);
  const focusOutline=await page.evaluate(()=>({style:getComputedStyle(document.activeElement).outlineStyle,width:getComputedStyle(document.activeElement).outlineWidth}));assert.notEqual(focusOutline.style,'none');
  await page.screenshot({path:output+`/${name}-keyboard.png`});await save('after-new');
  await page.getByRole('link',{name:'模块集合',exact:true}).click();await page.waitForURL(base+'/');await page.waitForFunction(()=>document.querySelectorAll('canvas').length===0);assert.deepEqual(errors,[]);
  rows.push({name,keyboardWorkerCancel:true,tabRadioSpace:true,dialogEscapeReturnsOpener:true,cancelRetainsSelection:true,pausedDialogStaysPaused:true,resetAndNewFocus:true,resetAndNewClearTargets:true,tabNextRoll:true,focusOutline,exitCanvas:0,errors});await context.close();
 }
 fs.writeFileSync(output+'/results.json',JSON.stringify(rows,null,2));console.log(JSON.stringify(rows));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
