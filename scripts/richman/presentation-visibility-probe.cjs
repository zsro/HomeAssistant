/** Uses real browser tabs and keyboard shortcuts; never changes visibility properties/events. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs');
const base=process.env.RICHMAN_BASE_URL||'http://127.0.0.1:5177';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:false,ignoreDefaultArgs:['--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding'],args:['--enable-unsafe-swiftshader']});try{
 const context=await browser.newContext();const page=await context.newPage();await page.goto(base+'/');
 await page.evaluate(()=>{const a=document.createElement('a');a.href='/';a.target='_blank';a.id='other-tab';a.textContent='new tab';document.body.append(a)});
 const popup=page.waitForEvent('popup');await page.locator('#other-tab').click();const other=await popup;await other.waitForLoadState();
 const read=()=>page.evaluate(()=>({hidden:document.hidden,state:document.visibilityState,focus:document.hasFocus()}));
 const log=[{action:'popup-click',...(await read())}];
 for(const shortcut of ['Control+Tab','Meta+Alt+ArrowRight','Meta+1','Meta+2']){
  await other.keyboard.press(shortcut);await page.waitForTimeout(250);log.push({action:shortcut,...(await read())});
 }
 await page.bringToFront();log.push({action:'bringToFront',...(await read())});
 fs.mkdirSync('/private/tmp/richman-presentation-visibility',{recursive:true});fs.writeFileSync('/private/tmp/richman-presentation-visibility/probe.json',JSON.stringify(log,null,2));console.log(JSON.stringify(log));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
