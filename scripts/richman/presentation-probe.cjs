/** Observe real media ports; never replaces play/pause outcomes or injects game state. */
exports.install = async context => context.addInitScript(() => {
  const NativeAudio=window.Audio, ports=[], events=[];
  window.Audio=function(...args){const a=new NativeAudio(...args),id=ports.length;ports.push(a);
    for(const type of ['play','playing','pause','ended','error','volumechange'])a.addEventListener(type,()=>events.push({type,id,src:a.currentSrc||a.src,time:a.currentTime,volume:a.volume,at:performance.now()}));
    return a;
  };window.Audio.prototype=NativeAudio.prototype;
  window.__presentationProbe=()=>({ports:ports.map((a,id)=>({id,src:a.currentSrc||a.src,attribute:a.getAttribute('src'),paused:a.paused,time:a.currentTime,volume:a.volume,ready:a.readyState,error:a.error?.code})),events});
});
exports.controls=async(page,path)=>{
 const assert=require('node:assert/strict'),b=name=>page.getByRole('button',{name,exact:true});
 await b('开启声音').waitFor();await page.waitForTimeout(150);
 assert.equal((await page.evaluate(()=>window.__presentationProbe())).events.filter(e=>e.type==='playing').length,0);
 await b('开启声音').click();await page.waitForFunction(()=>window.__presentationProbe().ports.some(p=>!p.paused&&p.time>0));
 const audio=page.getByRole('group',{name:'游戏声音'});
 for(const [label,value] of [['音乐音量','22'],['音效音量','47'],['语音音量','63']])await audio.getByLabel(label).fill(value);
 await b('静音').click();await page.waitForTimeout(100);assert.ok((await page.evaluate(()=>window.__presentationProbe())).ports.every(p=>p.paused));
 await b('取消静音').click();await page.waitForFunction(()=>window.__presentationProbe().ports.some(p=>!p.paused));
 await audio.screenshot({path:path+'/audio-controls.png'});
};
exports.snapshot=page=>page.evaluate(()=>window.__presentationProbe());
