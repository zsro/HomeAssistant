/** Connects to separately launched native Chrome; no visibility mutation. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs');
(async()=>{const browser=await chromium.connectOverCDP('http://127.0.0.1:9229');try{
 const context=browser.contexts()[0],page=context.pages()[0]||await context.newPage();await page.goto('http://127.0.0.1:5177/');
 const read=()=>page.evaluate(()=>({hidden:document.hidden,state:document.visibilityState,focus:document.hasFocus()}));
 await page.evaluate(()=>{window.__realVisibility=[];document.addEventListener('visibilitychange',()=>window.__realVisibility.push({at:performance.now(),event:true,hidden:document.hidden,state:document.visibilityState}));window.__realVisibilityTimer=setInterval(()=>window.__realVisibility.push({at:performance.now(),hidden:document.hidden,state:document.visibilityState}),100)});
 const id=async p=>(await(await context.newCDPSession(p)).send('Browser.getWindowForTarget')).windowId;
 const pageCdp=await context.newCDPSession(page),originalTarget=(await pageCdp.send('Target.getTargetInfo')).targetInfo.targetId;
 const windowId=await id(page),log=[{at:'initial',windowId,...(await read())}];
 const cdp=await browser.newBrowserCDPSession(),opened=context.waitForEvent('page');const created=await cdp.send('Target.createTarget',{url:'http://127.0.0.1:5177/',newWindow:false,background:false});const other=await opened;await other.waitForLoadState();await cdp.send('Target.activateTarget',{targetId:created.targetId});await other.waitForTimeout(700);
 await cdp.send('Target.activateTarget',{targetId:originalTarget});await page.waitForTimeout(150);log.push({at:'after-real-switch',windowId:await id(other),...(await read()),history:await page.evaluate(()=>window.__realVisibility)});
 await cdp.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'minimized'}});await page.waitForTimeout(700);await cdp.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'normal'}});await page.waitForTimeout(200);log.push({at:'after-real-minimize',...(await read()),history:await page.evaluate(()=>window.__realVisibility)});
 fs.mkdirSync('/private/tmp/richman-presentation-visibility',{recursive:true});fs.writeFileSync('/private/tmp/richman-presentation-visibility/native-cdp.json',JSON.stringify(log,null,2));console.log(JSON.stringify(log));
 await other.close();
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
