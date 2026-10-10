/** Original-map purchase event with a deterministic short-port NotAllowedError fault. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');
const base=process.env.RICHMAN_BASE_URL||'http://127.0.0.1:5177';
if(!['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname))throw Error('local only');
const media=require('./presentation-probe.cjs');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});try{
 const context=await browser.newContext({viewport:{width:1440,height:1080}});await media.install(context);
 const user={id:'richman-validation',username:'validation',displayName:'技术验证',inviteCode:'VALIDATION',invitedByUserId:null,status:'active',createdAt:'2026-09-28T00:00:00.000Z'};
 await context.route(base+'/api/**',async route=>route.request().url().endsWith('/users/me')?route.fulfill({json:{success:true,data:{user}}}):route.fulfill({status:404,json:{success:false}}));
 await context.addInitScript(({user})=>{
  localStorage.setItem('home-assistant.session.v1',JSON.stringify({user,tokens:{accessToken:'browser-test-only',refreshToken:'browser-test-only',tokenType:'Bearer',accessExpiresIn:3600,refreshExpiresIn:7200},accessExpiresAt:Date.now()+3600000,refreshExpiresAt:Date.now()+7200000}));
  const old=HTMLMediaElement.prototype.play;window.__shortRefusals=0;
  HTMLMediaElement.prototype.play=function(){if(this.src.includes('effect-49.wav')&&window.__shortRefusals++===0)return Promise.reject(new DOMException('short port refused','NotAllowedError'));return old.call(this)};
 },{user});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/modules/richman');
 const b=name=>page.getByRole('button',{name,exact:true}),v=page.getByTestId('richman-viewport');
 await b('新建对局').click();const d=page.getByRole('dialog');await d.getByLabel(/游戏模式/).selectOption('specialObjects');await d.getByLabel(/对局种子/).fill('special-2-0');await d.getByLabel(/每人初始资金/).selectOption('300000');await d.getByLabel('开局日期').fill('1998-01-01');for(let i=0;i<4;i++)await d.getByRole('checkbox').nth(i).setChecked(i<2);await d.getByRole('button',{name:'开始新对局'}).click();
 await b('开启声音').click();await page.waitForFunction(()=>window.__presentationProbe().ports.some(p=>!p.paused));
 await b('掷骰出发').click();await page.waitForFunction(()=>document.querySelector('[data-testid="richman-viewport"]')?.dataset.phase==='choosing');
 await page.getByRole('group',{name:'选择岔路'}).getByRole('button').filter({hasText:/· 3号/}).click();
 await page.waitForFunction(()=>document.querySelector('[data-testid="richman-viewport"]')?.dataset.phase==='property');
 await page.getByRole('group',{name:'当前地产决策'}).getByRole('button',{name:/确认购买/}).click();
 await page.waitForFunction(()=>document.querySelector('[role="status"]')?.textContent?.includes('重试播放')||document.body.textContent.includes('请点击重试播放'));
 const blocked={refusals:await page.evaluate(()=>window.__shortRefusals),media:await media.snapshot(page),retryVisible:await b('重试播放').isVisible(),phase:await v.getAttribute('data-phase')};
 assert.equal(blocked.refusals,1);assert.ok(blocked.media.ports.every(p=>p.paused&&!p.attribute));
 await b('重试播放').click();await page.waitForFunction(()=>window.__presentationProbe().ports.some(p=>!p.paused));
 const retry=await media.snapshot(page);assert.deepEqual(errors,[]);
 const result={scope:'original Japan map legal property purchase; short-port NotAllowedError deliberately injected at HTMLMediaElement.play, not natural browser policy',seed:'special-2-0',commands:'roll, choose 3, buy property + engine animation',blocked:{refusals:blocked.refusals,retryVisible:blocked.retryVisible,phase:blocked.phase,ports:blocked.media.ports},retry:{ports:retry.ports},errors};
 fs.mkdirSync('/private/tmp/richman-presentation-targeted',{recursive:true});fs.writeFileSync('/private/tmp/richman-presentation-targeted/short-refusal.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
