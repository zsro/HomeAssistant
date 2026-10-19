/** UI-08: release assets, high DPI, all entries, failures/retry, AI and lifecycle. Local only. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const base=process.env.RICHMAN_TEST_BASE_URL||'http://127.0.0.1:5174';
const output=process.env.RICHMAN_TEST_OUTPUT||'/private/tmp/richman-ui08/acceptance';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local validation only');
fs.mkdirSync(output,{recursive:true});
const user={id:'richman-validation',username:'validation',displayName:'技术验证',inviteCode:'VALIDATION',status:'active'};
async function install(context){
 await context.route(base+'/api/**',r=>r.fulfill({json:{success:true,data:{user}}}));
 await context.addInitScript(user=>{
  localStorage.setItem('home-assistant.session.v1',JSON.stringify({user,tokens:{accessToken:'browser-test-only',refreshToken:'browser-test-only',tokenType:'Bearer',accessExpiresIn:3600,refreshExpiresIn:7200},accessExpiresAt:Date.now()+3600000,refreshExpiresAt:Date.now()+7200000}));
  const pending=new Set(),raf=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window);
  window.requestAnimationFrame=cb=>{const id=raf(t=>{pending.delete(id);cb(t)});pending.add(id);return id;};window.cancelAnimationFrame=id=>{pending.delete(id);cancel(id);};
  const listeners=[],add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;
  const watched=(target,type)=>target instanceof HTMLCanvasElement||((target===document||target===window)&&['resize','visibilitychange','fullscreenchange','keydown'].includes(type));
  EventTarget.prototype.addEventListener=function(type,fn,options){if(watched(this,type)&&!listeners.some(x=>x.target===this&&x.type===type&&x.fn===fn&&x.capture===!!(typeof options==='boolean'?options:options?.capture)))listeners.push({target:this,type,fn,capture:!!(typeof options==='boolean'?options:options?.capture)});return add.call(this,type,fn,options);};
  EventTarget.prototype.removeEventListener=function(type,fn,options){const i=listeners.findIndex(x=>x.target===this&&x.type===type&&x.fn===fn&&x.capture===!!(typeof options==='boolean'?options:options?.capture));if(i>=0)listeners.splice(i,1);return remove.call(this,type,fn,options);};
  const observers=new Set(),OriginalObserver=ResizeObserver;
  window.ResizeObserver=class extends OriginalObserver{observe(...a){observers.add(this);return super.observe(...a);}disconnect(){observers.delete(this);return super.disconnect();}};
  window.ui08Probe=()=>({raf:pending.size,canvas:document.querySelectorAll('canvas').length,observers:observers.size,listeners:listeners.map(x=>({target:x.target instanceof HTMLCanvasElement?'canvas':x.target===window?'window':'document',type:x.type})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))});
 },user);
}
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
 const report={scenarios:[],entries:[],assets:[],errors:[]};
 try{
 for(const scenario of (process.env.RICHMAN_SCENARIOS?.split(',')||['normal-dpr2','required-retry','missing-animation','corrupt-animation','missing-ui','missing-audio','late-exit','context-loss','touch-portrait'])){
  const context=await browser.newContext({viewport:scenario==='touch-portrait'?{width:390,height:844}:{width:1440,height:1080},deviceScaleFactor:2,isMobile:scenario==='touch-portrait',hasTouch:scenario==='touch-portrait'});await install(context);
  if(scenario==='required-retry')await context.route('**/generated/manifest.json',r=>r.fulfill({status:404,body:'expected test failure'}));
  if(scenario==='missing-animation')await context.route('**/animation/manifest.json',r=>r.fulfill({status:404,body:'expected test failure'}));
  if(scenario==='corrupt-animation')await context.route('**/animation/manifest.json',r=>r.fulfill({json:{version:1,sprites:{}}}));
  if(scenario==='missing-ui')await context.route('**/ui/Data-1/*.png',r=>r.fulfill({status:404,body:'expected test failure'}));
  if(scenario==='missing-audio')await context.route('**/audio/manifest.json',r=>r.fulfill({status:404,body:'expected test failure'}));
  let requested;const waiting=new Promise(resolve=>requested=resolve);
  if(scenario==='late-exit')await context.route('**/animation/objects.webp',async r=>{requested();await new Promise(resolve=>setTimeout(resolve,1000));try{await r.continue();}catch{}});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(scenario+': '+e.message));
  await page.goto(base+'/');const baseline=await page.evaluate(()=>window.ui08Probe());
  await page.locator('a[href="/modules/richman"]').click();
  const system=page.locator('.rm-system-dialog'),host=page.locator('[data-window-host]'),viewport=page.getByTestId('richman-viewport');
  if(scenario==='late-exit'){
   await waiting;await page.getByRole('link',{name:'模块集合',exact:true}).click();await page.waitForURL(base+'/');await page.waitForTimeout(1300);
  }else{
   if(scenario==='required-retry'){
    await page.getByRole('button',{name:'重新加载'}).waitFor();await page.screenshot({path:output+'/required-error.png'});
    assert.equal(await page.locator('canvas').count(),0);await context.unroute('**/generated/manifest.json');await page.getByRole('button',{name:'重新加载'}).click();
   }
   await system.getByRole('heading',{name:'大富翁4 · 主菜单'}).waitFor();
   if(scenario==='missing-audio'){
    await system.getByRole('button',{name:'OPTION · 设置'}).click();assert.equal(await system.getByRole('button',{name:'开启声音'}).isDisabled(),true);assert.match(await system.innerText(),/音频暂不可用/);await page.keyboard.press('Escape');
   }
   if(scenario==='touch-portrait')await system.getByRole('button',{name:'继续当前对局'}).tap();else await system.getByRole('button',{name:'继续当前对局'}).click();
   await viewport.locator('canvas').waitFor();
   if(scenario==='context-loss'){
    await viewport.locator('canvas').evaluate(c=>{const gl=c.getContext('webgl2')||c.getContext('webgl');const extension=gl?.getExtension('WEBGL_lose_context');if(!extension)throw Error('WebGL context loss extension unavailable');extension.loseContext();});
    await page.getByRole('button',{name:'重新加载'}).waitFor();await page.getByRole('button',{name:'重新加载'}).click();await viewport.locator('canvas').waitFor();await page.getByRole('button',{name:'掷骰出发',exact:true}).waitFor({state:'visible'});
   }
   if(scenario==='normal-dpr2'){
    const size=await viewport.locator('canvas').evaluate(c=>({width:c.width,height:c.height,logical:[c.clientWidth,c.clientHeight],dpr:devicePixelRatio}));assert.deepEqual(size,{width:880,height:880,logical:[440,440],dpr:2});
    const revision=await viewport.getAttribute('data-revision');
    await page.getByRole('button',{name:'更多功能',exact:true}).click();const names=await host.getByRole('navigation',{name:'全部功能'}).getByRole('button').allTextContents();assert.equal(names.length,29);
    for(const name of names){await host.getByRole('button',{name,exact:true}).click();assert.ok((await host.locator('.rm-window-body').innerText()).trim().length>0,name);report.entries.push({name,panel:await host.getAttribute('data-panel'),text:(await host.locator('.rm-window-body').innerText()).slice(0,180)});await host.getByRole('button',{name:'关闭窗口'}).click();await page.getByRole('button',{name:'更多功能',exact:true}).click();}
    await host.getByRole('button',{name:'关闭窗口'}).click();assert.equal(await viewport.getAttribute('data-revision'),revision);
    await page.screenshot({path:output+'/desktop-dpr2.png'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:output+'/portrait-dpr2.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.setViewportSize({width:1440,height:1080});
    const resources=JSON.parse(fs.readFileSync('scripts/richman/release-assets.json','utf8')).files;
    report.assets=await page.evaluate(async resources=>{const rows=[];for(const entry of resources){const response=await fetch('/richman/generated/'+entry.path);if(!response.ok)throw Error(entry.path+': '+response.status);const blob=await response.blob();let dimensions=null;if(/\.(png|webp)$/.test(entry.path)){const image=await createImageBitmap(blob);dimensions=[image.width,image.height];image.close();if(Math.max(...dimensions)>4096)throw Error('Texture exceeds budget: '+entry.path);}rows.push({path:entry.path,bytes:blob.size,dimensions});}return rows;},resources);assert.equal(report.assets.length,169);
    // Actual computer turns, without mutating game state or speeding the clock.
    await page.locator('.rm-game-toolbar').getByRole('button',{name:'新建对局'}).click();await system.getByText('高级设置 · 历史模式、电脑策略与种子',{exact:true}).click();await system.getByLabel('游戏模式',{exact:true}).selectOption('surrender');await system.getByLabel(/对局种子/).fill('ui08-ai');
    for(const name of ['孙小美','阿土伯','钱夫人','沙隆巴斯'])await system.getByRole('checkbox',{name,exact:true}).setChecked(['孙小美','钱夫人'].includes(name));
    for(const name of ['孙小美','钱夫人'])await system.getByLabel(name+'控制方式').selectOption('computer');await system.getByLabel('电脑策略',{exact:true}).selectOption('basic-v1');await system.getByRole('button',{name:'开始新对局'}).click();
    await page.waitForFunction(()=>Number(document.querySelector('.rm-viewport').dataset.turn)>=3,null,{timeout:60000});
    await page.locator('.rm-game-toolbar').getByRole('button',{name:'主菜单'}).click();const r=await viewport.getAttribute('data-revision');await page.waitForTimeout(600);assert.equal(await viewport.getAttribute('data-revision'),r);
    const d=page.waitForEvent('download');await system.getByRole('button',{name:'下载回放记录'}).click();await(await d).saveAs(output+'/computer-replay.json');await system.getByRole('button',{name:'EXIT · 返回模块集合'}).click();
   }else{
    // Optional art failures still leave the real action usable.
    if(scenario==='touch-portrait'){const toolbar=page.getByRole('navigation',{name:'原版工具栏'});await toolbar.getByRole('button',{name:'设置',exact:true}).tap();await system.getByRole('button',{name:'返回对局'}).tap();await page.getByRole('button',{name:'GO：掷骰出发',exact:true}).tap();await page.screenshot({path:output+'/touch-portrait.png'});}else await page.getByRole('button',{name:'掷骰出发',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.rm-viewport').dataset.phase!=='idle');
    await page.getByRole('link',{name:'模块集合',exact:true}).click();
   }
   await system.getByRole('button',{name:'确认返回模块集合'}).click();await page.waitForURL(base+'/');await viewport.waitFor({state:'detached'});await page.waitForTimeout(300);
  }
  const cleanup=await page.evaluate(()=>window.ui08Probe());assert.deepEqual(cleanup,baseline,scenario+' leaves no extra RAF, observer, canvas or watched listeners');
  report.scenarios.push({scenario,cleanup,passed:true});await context.close();console.log(scenario+' passed');
 }
 assert.deepEqual(report.errors,[]);fs.writeFileSync(output+'/results.json',JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
