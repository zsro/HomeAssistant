/** Same Chrome process, fresh contexts, alternating committed baseline/release. Local only. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs');
const output=process.env.RICHMAN_TEST_OUTPUT||'/private/tmp/richman-ui08/performance';fs.mkdirSync(output,{recursive:true});
const targets=[{name:'baseline',url:'http://127.0.0.1:5176'},{name:'candidate',url:process.env.RICHMAN_TEST_BASE_URL||'http://127.0.0.1:5175'}];
if(targets.some(t=>!['localhost','127.0.0.1'].includes(new URL(t.url).hostname)))throw Error('Local only');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});const samples=[];
 try{for(let run=1;run<=3;run++)for(const target of run%2?targets:[...targets].reverse()){
  const context=await browser.newContext({viewport:{width:1440,height:1080},deviceScaleFactor:1});
  const user={id:'validation',username:'validation',displayName:'技术验证',inviteCode:'VALIDATION',status:'active'};
  await context.route(target.url+'/api/**',r=>r.fulfill({json:{success:true,data:{user}}}));
  await context.addInitScript(user=>localStorage.setItem('home-assistant.session.v1',JSON.stringify({user,tokens:{accessToken:'browser-test-only',refreshToken:'browser-test-only',tokenType:'Bearer',accessExpiresIn:3600,refreshExpiresIn:7200},accessExpiresAt:Date.now()+3600000,refreshExpiresAt:Date.now()+7200000})),user);
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const start=Date.now();await page.goto(target.url+'/modules/richman');await page.locator('.rm-viewport canvas').waitFor().catch(async e=>{console.error(target.name,await page.locator('body').innerText());throw e;});
  const canvasReadyMs=Date.now()-start;
  if(target.name==='candidate')await page.locator('.rm-system-dialog').getByRole('button',{name:'继续当前对局'}).click();
  const fps=[];for(let i=0;i<6;i++){await page.waitForTimeout(1000);const text=await page.locator('.rm-diagnostics summary').textContent();fps.push(Number(text.match(/(\d+) FPS/)?.[1]));}
  const data=await page.evaluate(()=>{const r=performance.getEntriesByType('resource'),c=document.querySelector('.rm-viewport canvas');return {sceneLoadMs:Number(document.querySelector('.rm-diagnostic-body').textContent.match(/首次场景加载 (\d+) ms/)?.[1]),canvas:[c.width,c.height],requests:r.length,transferredBytes:r.reduce((sum,x)=>sum+x.transferSize,0)};});
  if(run===1)await page.screenshot({path:output+'/'+target.name+'.png'});
  if(errors.length)throw Error(errors.join('\n'));samples.push({target:target.name,run,canvasReadyMs,fps,...data});await context.close();
 }
 const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
 const summary=Object.fromEntries(targets.map(t=>{const s=samples.filter(x=>x.target===t.name);return[t.name,{canvasReadyMs:median(s.map(x=>x.canvasReadyMs)),sceneLoadMs:median(s.map(x=>x.sceneLoadMs)),fps:median(s.flatMap(x=>x.fps)),requests:median(s.map(x=>x.requests)),transferredBytes:median(s.map(x=>x.transferredBytes)),canvas:s[0].canvas}];}));
 fs.writeFileSync(output+'/results.json',JSON.stringify({environment:'Same local Chrome headless + SwiftShader, DPR 1, 1440x1080; 3 fresh contexts each, alternating order; idle scene, not hardware GPU benchmark',samples,summary},null,2));console.log(summary);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
