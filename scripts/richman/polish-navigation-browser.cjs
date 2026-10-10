/** S3-05b: short real worker entry on original map, no game-state injection. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const base=process.env.RICHMAN_BASE_URL||'http://127.0.0.1:5177';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('local only');
const output='/private/tmp/richman-polish-navigation';fs.mkdirSync(output,{recursive:true});
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
  await page.evaluate(()=>{window.pointerEvidence=[];for(const type of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture'])document.querySelector('canvas').addEventListener(type,e=>window.pointerEvidence.push({type:e.type,kind:e.pointerType,trusted:e.isTrusted,x:e.clientX,y:e.clientY}));});
  const revision=()=>page.getByTestId('richman-viewport').getAttribute('data-revision');const initial=await revision();
  await act(b('操作帮助'));assert.ok(await page.locator('.rm-help').getAttribute('open')!==null);assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('rm-help')),true);
  await act(b('回到地图'));assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('rm-board')),true);assert.equal(await revision(),initial);
  await act(b('使用机器工人'));await act(b('当前操作'));assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'机器工人选择');
  await act(worker.getByRole('radio').first());const selected=await worker.locator('label.is-selected').innerText();
  await act(b('回到地图'));await act(b('查看全图'));
  // Empty ocean in overview; confirmed by miss feedback, not assumed from coordinates.
  const tapMap=async()=>{const box=await canvas.boundingBox();await (mobile?page.touchscreen.tap(box.x+30,box.y+box.height-70):page.mouse.click(box.x+30,box.y+box.height-70));};
  await tapMap();await page.locator('.rm-map-feedback').waitFor();assert.equal(await worker.locator('label.is-selected').innerText(),selected);
  await page.screenshot({path:output+`/${name}-invalid.png`});
  await act(b('当前操作'));await act(worker.getByRole('radio').nth(1));await act(worker.getByRole('radio').first());assert.equal(await page.locator('.rm-map-feedback').count(),0);
  await act(b('回到地图'));await act(b('跟随当前角色'));
  const before=await revision(),box=await canvas.boundingBox(),x=box.x+box.width*.5,y=box.y+box.height*.55;
  const client=await context.newCDPSession(page);
  const touch=(type,points)=>client.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y])=>({x,y,id:1}))});
  await page.screenshot({path:output+`/${name}-before-drag.png`});
  if(mobile){await touch('touchStart',[[x,y]]);await touch('touchMove',[[x+70,y+35]]);await touch('touchMove',[[x+100,y+50]]);await touch('touchEnd',[]);}else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+100,y+50,{steps:6});await page.mouse.up();}
  await page.screenshot({path:output+`/${name}-after-drag.png`});
  assert.equal(await revision(),before);assert.equal(await page.locator('.rm-map-feedback').count(),0);assert.equal(await worker.locator('label.is-selected').innerText(),selected);
  // Browser touchCancel produces a trusted pointercancel. Desktop releasePointerCapture is explicit fault injection.
  if(mobile){await touch('touchStart',[[x,y]]);await touch('touchMove',[[x+12,y]]);await touch('touchCancel',[]);}else{await page.mouse.move(x,y);await page.mouse.down();await canvas.evaluate(el=>{for(let i=1;i<5;i++)if(el.hasPointerCapture(i))el.releasePointerCapture(i)});await page.mouse.up();}
  assert.equal(await revision(),before);assert.equal(await page.locator('.rm-map-feedback').count(),0);
  // A real pause/resume button command while the contact remains down invalidates the gesture.
  if(mobile)await touch('touchStart',[[x,y]]);else{await page.mouse.move(x,y);await page.mouse.down();}
  await b('暂停').evaluate(el=>el.click());assert.ok(await worker.getByRole('button',{name:'确认建造'}).isDisabled());await b('继续旅程').evaluate(el=>el.click());
  if(mobile)await touch('touchEnd',[]);else await page.mouse.up();
  assert.equal(await page.locator('.rm-map-feedback').count(),0);assert.equal(await worker.locator('label.is-selected').innerText(),selected);
  // Confirm a fresh contact works after all interruptions.
  await act(b('查看全图'));await tapMap();await page.locator('.rm-map-feedback').waitFor();
  await act(b('当前操作'));await act(worker.getByRole('button',{name:'取消使用'}));assert.equal(await page.locator('.rm-map-feedback').count(),0);
  await act(b('使用机器工人'));assert.ok(await worker.getByRole('button',{name:'确认建造'}).isDisabled());await act(worker.getByRole('button',{name:'取消使用'}));
  // Explicit UI API fault injection, not a natural fullscreen denial.
  await page.evaluate(()=>{window.savedFullscreen=HTMLElement.prototype.requestFullscreen;HTMLElement.prototype.requestFullscreen=function(){return Promise.reject(new DOMException('S3-05b injected fullscreen denial','NotAllowedError'))}});
  await act(b('全屏游戏'));await page.locator('.rm-page.is-expanded').waitFor();assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden');
  await act(b('操作帮助'));assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('rm-help')),true);
  await act(b('回到地图'));await page.screenshot({path:output+`/${name}-fallback.png`});
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.is-expanded'));assert.notEqual(await page.evaluate(()=>document.body.style.overflow),'hidden');
  await page.evaluate(()=>{HTMLElement.prototype.requestFullscreen=window.savedFullscreen});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);assert.equal(overflow,false);
  await page.locator('summary').filter({hasText:'运行信息与验证工具'}).click();const download=page.waitForEvent('download');await b('下载回放记录').click();await(await download).saveAs(output+`/${name}-replay.json`);
  const pointerEvidence=await page.evaluate(()=>window.pointerEvidence);if(mobile)assert.ok(pointerEvidence.some(e=>e.type==='pointercancel'&&e.kind==='touch'&&e.trusted));
  await page.getByRole('link',{name:'模块集合',exact:true}).click();await page.waitForURL(base+'/');await page.waitForFunction(()=>document.querySelectorAll('canvas').length===0);assert.deepEqual(errors,[]);
  rows.push({name,originalMap:true,authOnlyFixture:true,navigationFocus:true,invalidHitPreservesSelection:true,dragDoesNotSelect:true,interruptAndPauseResume:true,fullscreenFallback:'injected requestFullscreen rejection, expanded help/map navigation and Escape/body restore',overflow,pointerEvidence,errors});await context.close();
 }
 fs.writeFileSync(output+'/results.json',JSON.stringify({scope:'short original-map worker; Chrome desktop/touch emulation; fullscreen fault injection explicitly separate',rows},null,2));console.log(JSON.stringify(rows.map(({pointerEvidence,...row})=>({...row,pointerEvents:pointerEvidence.length}))));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
