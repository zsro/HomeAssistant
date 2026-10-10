/** Loopback-only acceptance proxy for a regular Chrome tab controlled via native UI.
 * Serves the unchanged Vite app, supplies auth-only fixtures and records native
 * visibility/media outcomes. Never alters visibility, playback outcome or game state.
 */
const http=require('node:http'),fs=require('node:fs');
const output=process.env.RICHMAN_OUTPUT||'/private/tmp/richman-native-tab';fs.mkdirSync(output,{recursive:true});
const user={id:'richman-validation',username:'validation',displayName:'技术验证',inviteCode:'VALIDATION',invitedByUserId:null,status:'active',createdAt:'2026-09-28T00:00:00.000Z'};
const probe=`(${function(user){
 localStorage.setItem('home-assistant.session.v1',JSON.stringify({user,tokens:{accessToken:'browser-test-only',refreshToken:'browser-test-only',tokenType:'Bearer',accessExpiresIn:3600,refreshExpiresIn:7200},accessExpiresAt:Date.now()+3600000,refreshExpiresAt:Date.now()+7200000}));
 const ports=[],events=[],visibility=[],outcomes=[],errors=[],samples=[];
 const NativeAudio=window.Audio,nativePlay=HTMLMediaElement.prototype.play;
 const snapshot=()=>ports.map((a,id)=>({id,src:a.currentSrc||a.src,attribute:a.getAttribute('src'),paused:a.paused,time:a.currentTime,volume:a.volume,ready:a.readyState}));
 window.Audio=function(...args){const a=new NativeAudio(...args),id=ports.length;ports.push(a);for(const type of ['play','playing','pause','ended','error'])a.addEventListener(type,()=>events.push({type,id,src:a.currentSrc||a.src,time:a.currentTime,at:performance.now()}));return a};window.Audio.prototype=NativeAudio.prototype;
 HTMLMediaElement.prototype.play=function(){const row={id:ports.indexOf(this),src:this.src,at:performance.now(),active:navigator.userActivation.isActive,everActive:navigator.userActivation.hasBeenActive};outcomes.push(row);return nativePlay.call(this).then(v=>{row.result='resolved';return v},e=>{row.result='rejected';row.name=e.name;row.message=e.message;throw e})};
 const phase=()=>document.querySelector('[data-testid="richman-viewport"]')?.getAttribute('data-phase');
 const capture=(kind,trusted)=>visibility.push({kind,trusted,hidden:document.hidden,state:document.visibilityState,at:performance.now(),phase:phase(),ports:snapshot()});
 document.addEventListener('visibilitychange',e=>{capture('event',e.isTrusted);setTimeout(()=>capture('settled'),180)});
 window.addEventListener('error',e=>errors.push(e.message));
 const nativeURL=URL.createObjectURL;
 URL.createObjectURL=function(blob){if(blob instanceof Blob&&blob.type.includes('json'))blob.text().then(t=>{try{const r=JSON.parse(t);if(r.rulesId&&r.commands)fetch('/__acceptance/replay',{method:'POST',body:t})}catch{}});return nativeURL.call(this,blob)};
 const report=()=>{samples.push({at:performance.now(),hidden:document.hidden,phase:phase(),ports:snapshot()});if(samples.length>180)samples.shift();fetch('/__acceptance/result',{method:'POST',body:JSON.stringify({scope:'regular native Chrome tab, unchanged original app, auth-only fixture, passive media/visibility observers',browser:navigator.userAgent,hidden:document.hidden,phase:phase(),visibility,events,outcomes,samples,ports:snapshot(),errors})}).catch(()=>{})};
 setInterval(report,1000);document.addEventListener('visibilitychange',report);
 window.addEventListener('pagehide',()=>navigator.sendBeacon('/__acceptance/result',JSON.stringify({scope:'native pagehide',visibility,events,outcomes,samples,ports:snapshot(),errors})));
}})(${JSON.stringify(user)});`;
const server=http.createServer(async(req,res)=>{
 try{
 if(req.method==='POST'&&['/__acceptance/result','/__acceptance/replay'].includes(req.url)){
  let data='';for await(const chunk of req){data+=chunk;if(data.length>5000000)throw Error('too large')}
  JSON.parse(data);fs.writeFileSync(output+(req.url.endsWith('replay')?'/replay.json':'/result.json'),data);res.end('ok');return;
 }
 if(req.url.startsWith('/api/')){res.setHeader('content-type','application/json');res.end(JSON.stringify(req.url==='/api/v1/users/me'?{success:true,data:{user}}:{success:false}));return}
 if(req.method!=='GET'){res.writeHead(405);res.end();return}
 const upstream=await fetch('http://127.0.0.1:5177'+req.url),type=upstream.headers.get('content-type')||'';
 res.statusCode=upstream.status;res.setHeader('content-type',type);res.setHeader('cache-control','no-store');
 if(type.includes('text/html')){let html=await upstream.text();html=html.replace('<head>','<head><script>'+probe+'</script>');res.end(html)}else res.end(Buffer.from(await upstream.arrayBuffer()));
 }catch(e){res.writeHead(500);res.end(String(e))}
});
server.listen(5178,'127.0.0.1',()=>console.log('Native test tab: http://127.0.0.1:5178/modules/richman ; results '+output));
