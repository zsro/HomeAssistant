const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict'),media=require('./presentation-probe.cjs');
const baseUrl=process.env.RICHMAN_BASE_URL||'http://127.0.0.1:5177';
if(!['localhost','127.0.0.1','[::1]'].includes(new URL(baseUrl).hostname))throw Error('Local only');
const path='/private/tmp/richman-presentation-loading'+(process.env.RICHMAN_HEADED?'-headed':'');fs.mkdirSync(path,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:!process.env.RICHMAN_HEADED,ignoreDefaultArgs:['--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-background-timer-throttling'],args:['--enable-unsafe-swiftshader','--autoplay-policy=document-user-activation-required']});
 const results=[];let visibility=null;
 try {for(const scenario of (process.env.RICHMAN_HEADED?['normal']:['normal','missing-art','corrupt-art','missing-audio','failed-track','late-art-exit'])){
  const context=await browser.newContext({viewport:{width:1440,height:1080}});await media.install(context);
  const user={id:'richman-validation',username:'validation',displayName:'技术验证',inviteCode:'VALIDATION',status:'active'};
  await context.route(baseUrl+'/api/**',r=>r.fulfill({json:{success:true,data:{user}}}));
  await context.addInitScript(user=>localStorage.setItem('home-assistant.session.v1',JSON.stringify({user,tokens:{accessToken:'test',refreshToken:'test',tokenType:'Bearer',accessExpiresIn:3600,refreshExpiresIn:7200},accessExpiresAt:Date.now()+3600000,refreshExpiresAt:Date.now()+7200000})),user);
  if(scenario==='missing-art')await context.route('**/animation/manifest.json',r=>r.fulfill({status:404,body:'missing'}));
  if(scenario==='corrupt-art')await context.route('**/animation/manifest.json',r=>r.fulfill({json:{version:1,profile:'object-presentation-v1',sprites:{}}}));
  if(scenario==='missing-audio')await context.route('**/audio/manifest.json',r=>r.fulfill({status:404,body:'missing'}));
  if(scenario==='failed-track')await context.route('**/audio/*.mp3',r=>r.fulfill({status:404,body:'missing'}));
  let resolveArt;const artRequested=new Promise(r=>resolveArt=r);
  if(scenario==='late-art-exit')await context.route('**/animation/objects.webp',async r=>{resolveArt();await new Promise(done=>setTimeout(done,1200));try{await r.continue()}catch{}});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(baseUrl+'/modules/richman');
  const b=name=>page.getByRole('button',{name,exact:true});
  if(scenario==='late-art-exit'){await artRequested;await page.getByRole('link',{name:'模块集合',exact:true}).click();await page.waitForTimeout(1500);assert.equal(await page.locator('canvas').count(),0);}
  else {
   await page.locator('[data-testid="richman-viewport"] canvas').waitFor();
   await page.getByTestId('richman-viewport').screenshot({path:path+'/'+scenario+'.png'});
   if(scenario==='missing-audio'){assert.ok(await b('开启声音').isDisabled());assert.match(await page.getByRole('group',{name:'游戏声音'}).innerText(),/暂不可用/);}
   else if(scenario==='failed-track'){
    await b('开启声音').click();await b('重试播放').waitFor();await context.unroute('**/audio/*.mp3');await b('重试播放').click();await page.waitForFunction(()=>window.__presentationProbe().ports.some(p=>!p.paused&&p.time>0));
   } else {await media.controls(page,path);
    await b('暂停').click();await page.waitForTimeout(100);assert.ok((await media.snapshot(page)).ports.every(p=>p.paused));await b('继续旅程').click();
    await page.waitForFunction(()=>window.__presentationProbe().ports.some(p=>!p.paused));
    if(scenario==='normal'){
      const cdp=await context.newCDPSession(page);const {windowId}=await cdp.send('Browser.getWindowForTarget');
      await cdp.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'minimized'}});await page.waitForTimeout(500);
      const hidden=(await cdp.send('Runtime.evaluate',{expression:'document.hidden',returnByValue:true,userGesture:false})).result.value;visibility={hiddenObserved:hidden,method:'real Chrome window minimized via CDP'};
      if(hidden)assert.ok((await media.snapshot(page)).ports.every(p=>p.paused));
      await cdp.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'normal'}});await page.bringToFront();await page.waitForFunction(()=>!document.hidden&&window.__presentationProbe().ports.some(p=>!p.paused));
    }
   }
   await page.getByRole('link',{name:'模块集合',exact:true}).click();await page.waitForTimeout(200);assert.equal(await page.locator('canvas').count(),0);assert.ok((await media.snapshot(page)).ports.every(p=>p.paused&&!p.attribute));
  }
  assert.deepEqual(errors,[]);results.push({scenario,passed:true,media:await media.snapshot(page),canvasAfterExit:await page.locator('canvas').count(),errors});await context.close();console.log(scenario,'passed');
 }}finally{fs.writeFileSync(path+'/results.json',JSON.stringify({browser:process.env.RICHMAN_HEADED?'Chrome headed visibility check; no listening claim':'Chrome headless, actual media ports, default muted output; no listening claim',results,visibility},null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
