/** Independent browser-media check; packets are media test inputs, not original-map game events. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs');const assert=require('node:assert/strict');
const base=process.env.RICHMAN_BASE_URL||'http://127.0.0.1:5177';
if(!['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname))throw Error('local only');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
 try{
  const context=await browser.newContext();
  await context.addInitScript(()=>{
   const NativeAudio=window.Audio;window.__mediaPorts=[];window.__mediaEvents=[];
   window.Audio=function(...args){const a=new NativeAudio(...args),id=window.__mediaPorts.length;window.__mediaPorts.push(a);
    for(const type of ['play','playing','pause','ended','error'])a.addEventListener(type,()=>window.__mediaEvents.push({type,id,src:a.currentSrc||a.src}));return a};
   window.Audio.prototype=NativeAudio.prototype;
  });
  const page=await context.newPage();await page.goto(base+'/');
  await page.evaluate(async()=>{
   const {RichmanAudio}=await import('/src/features/richman/audio.ts');
   const manifest=await(await fetch('/richman/generated/audio/manifest.json')).json();
   window.__sound=new RichmanAudio();window.__sound.configure(manifest);
   window.__sound.receive({gameId:'media-a',revision:0,turn:1,active:true,paused:false,landings:[]});
   const btn=document.createElement('button');btn.id='media-unlock';btn.textContent='Unlock media';btn.onclick=()=>window.__sound.unlock();document.body.append(btn);
  });
  await page.locator('#media-unlock').click();
  await page.waitForFunction(()=>window.__mediaPorts.some(a=>a.src.includes('track02')&&!a.paused));
  const queue=await page.evaluate(()=>{
   const voice=(sequence,id,priority)=>({sequence,id,priority,channel:'voice'});
   window.__sound.receive({gameId:'media-a',revision:1,turn:1,active:true,paused:false,landings:[],cues:[voice(1,'1293',1),voice(2,'1294',1),voice(3,'1308',2)]});
   return {ports:window.__mediaPorts.map(a=>({src:a.getAttribute('src'),paused:a.paused})),status:window.__sound.status};
  });
  assert.ok(queue.ports.some(p=>p.src?.includes('1308')));
  assert.ok(queue.ports.some(p=>p.src===null));
  const flush=await page.evaluate(()=>{
   window.__sound.receive({gameId:'media-a',revision:2,turn:1,active:true,paused:false,flush:true,landings:[]});
   return window.__mediaPorts.map(a=>({src:a.getAttribute('src'),paused:a.paused}));
  });
  assert.ok(flush.filter((_,i)=>i>0).every(p=>p.src===null&&p.paused));
  const blocked=await page.evaluate(async()=>{
   const old=HTMLMediaElement.prototype.play;
   HTMLMediaElement.prototype.play=function(){if(this.src.includes('effect-43'))return Promise.reject(new DOMException('media port refused','NotAllowedError'));return old.call(this)};
   window.__sound.receive({gameId:'media-a',revision:3,turn:1,active:true,paused:false,landings:[],cues:[{sequence:4,channel:'effect',id:'43',priority:1}]});
   await new Promise(r=>setTimeout(r,50));HTMLMediaElement.prototype.play=old;
   return {status:window.__sound.status,ports:window.__mediaPorts.map(a=>({src:a.getAttribute('src'),paused:a.paused}))};
  });
  assert.equal(blocked.status.blocked,true);
  assert.ok(blocked.ports.every(p=>p.paused&&p.src===null));
  await page.locator('#media-unlock').click();
  await page.waitForFunction(()=>window.__sound.status.blocked===false&&window.__mediaPorts.some(a=>a.src.includes('track02')&&!a.paused));
  const reset=await page.evaluate(()=>{
   window.__sound.receive({gameId:'media-b',revision:0,turn:1,active:true,paused:false,landings:[]});
   return {ports:window.__mediaPorts.map(a=>({src:a.getAttribute('src'),paused:a.paused})),events:window.__mediaEvents};
  });
  assert.ok(reset.ports.slice(0,-1).every(p=>p.src===null&&p.paused));
  const result={scope:'independent browser-media packets; NOT original-map trigger; one deliberate NotAllowedError on short port',queue,flush,blocked,retry:true,reset:{ports:reset.ports},browser:await browser.version()};
  fs.mkdirSync('/private/tmp/richman-presentation-targeted',{recursive:true});fs.writeFileSync('/private/tmp/richman-presentation-targeted/media-boundaries.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
