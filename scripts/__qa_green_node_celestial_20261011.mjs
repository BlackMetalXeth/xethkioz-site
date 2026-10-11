import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';

const outDir = 'E:\\WEB XETHKIOZ\\03_EXPORTS_QA\\GREEN_NODE_CELESTIAL_20261011';
fs.mkdirSync(outDir,{recursive:true});
const browser = await chromium.launch({channel:'chrome',headless:true});
let failed = false;
for(const width of [320,360,390,768,1024,1440]){
  const context = await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,locale:'es-AR',reducedMotion:'reduce'});
  const page = await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:30000});
  const green = page.locator('.xk-hero-doors > a.is-green');
  await green.waitFor();
  const consent=page.getByRole('button',{name:/solo esenciales/i});
  if(await consent.count()) try{await consent.click({timeout:1500});}catch{}
  const data=await page.evaluate(()=>{
    const r=sel=>{const e=document.querySelector(sel);if(!e)return null;const b=e.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,right:b.right,bottom:b.bottom};};
    const card=r('.xk-hero-doors > a.is-green');
    const name=r('.is-green .xk-portal-name');
    const kicker=r('.is-green .xk-portal-name small');
    const subtitle=r('.is-green .xk-green-node-subtitle');
    const cta=r('.is-green .xk-portal-name em');
    const boxFit=v=>v&&v.x>=card.x-2&&v.right<=card.right+2&&v.y>=card.y-2&&v.bottom<=card.bottom+2;
    return {overflow:document.documentElement.scrollWidth-innerWidth,heroLinks:document.querySelectorAll('.xk-hero-doors > a').length,
      secondGreen:document.querySelectorAll('.wox-ecosystem-card.is-green').length,
      assetCss:getComputedStyle(document.querySelector('.xk-hero-doors > a.is-green')).backgroundImage.includes('green-node-celestial-2026.svg'),
      card, name, kicker, subtitle, cta, fits:[boxFit(name),boxFit(kicker),boxFit(subtitle),boxFit(cta)],
      url:document.querySelector('.xk-hero-doors > a.is-green').getAttribute('href')};
  });
  const asset=await page.evaluate(async()=>{
    const r=await fetch('/assets/green-node-celestial-2026.svg');
    const image = new Image(); image.src='/assets/green-node-celestial-2026.svg'; let imageLoaded=false; try { await image.decode(); imageLoaded=image.naturalWidth>0; } catch {} 
    return {status:r.status,contentType:r.headers.get('content-type'),startsSvg:(await r.text()).trim().startsWith('<svg'),imageLoaded};
  });
  const pass=data.overflow<=1&&data.heroLinks===4&&data.secondGreen===0&&data.assetCss&&data.fits.every(Boolean)&&data.url==='/green-node'&&asset.status===200&&asset.startsSvg&&asset.imageLoaded&&errors.length===0;
  failed ||= !pass;
  if([390,1440].includes(width)){
    await green.screenshot({path:path.join(outDir,'green-node-'+width+'.png'),animations:'disabled'});
  }
  console.log(JSON.stringify({width,pass, data,asset,errors}));
  if(width===1440){
    try{
      const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
      console.log(JSON.stringify({axeViolations:results.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length,firstTarget:v.nodes[0]?.target}))}));
      if(results.violations.length) failed=true;
    }catch(e){console.log(JSON.stringify({axeError:String(e)}));failed=true;}
  }
  await green.click();
  await page.waitForURL(/green-node/,{timeout:10000});
  const targetOk=page.url().includes('/green-node');
  failed ||= !targetOk;
  console.log(JSON.stringify({width,greenNavigation:targetOk}));
  await context.close();
}
await browser.close();
process.exitCode=failed?2:0;
