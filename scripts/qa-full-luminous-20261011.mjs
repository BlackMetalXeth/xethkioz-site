import { chromium } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs'
import path from 'node:path'

const base = process.env.QA_SITE || 'http://127.0.0.1:4175'
const dest = 'E:\\WEB XETHKIOZ\\03_EXPORTS_QA\\FULL_LUMINOUS_20261011'
fs.mkdirSync(dest, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
let failed = false
const issues = []
const log = x => console.log(JSON.stringify(x))
async function closePrivacyDialog(page){
  const button=page.getByRole('button',{name:/solo esenciales|essential only/i})
  if(await button.count()) try{await button.first().click({timeout:2000})}catch{}
}
const rect = el => { const r = el.getBoundingClientRect(); return { left:r.left, top:r.top, right:r.right, bottom:r.bottom, width:r.width, height:r.height } }
const allRoutes = [
 { url:'/world-of-xethkioz/elemental-realms', kind:'Elemental Realms' },
 { url:'/digital', kind:'Digital' },
 { url:'/green-node', kind:'Green Node' },
 { url:'/mascotas/', kind:'Huellas' },
 { url:'/en', kind:'English home' }
]
for (const width of [320,360,390,768,1024,1440]) {
  const ctx = await browser.newContext({viewport:{width,height:900},locale:'es-AR',reducedMotion:'reduce'})
  const page = await ctx.newPage()
  const jsErrors = []
  page.on('pageerror', e=>jsErrors.push(e.message))
  const response = await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:30000})
  await page.locator('nav.xk-light-worlds > a').first().waitFor({timeout:16000})
  await closePrivacyDialog(page)
  // Each promotional image is lazy; scroll into view and decode before testing it.
  for (const card of await page.locator('nav.xk-light-worlds > a').all()) {
    await card.scrollIntoViewIfNeeded()
    await card.locator('img').evaluate(async img => { await img.decode().catch(() => {}) })
  }
  const diag = await page.evaluate(()=>{
    const main=document.querySelector('.xk-launcher-home')
    const cards=Array.from(document.querySelectorAll('nav.xk-light-worlds > a'))
    const boxes=cards.map(c=>{
      const outer=c.getBoundingClientRect()
      const children=[c.querySelector('small'),c.querySelector('strong'),c.querySelector('b')].map(x=>x?.getBoundingClientRect())
      const within=children.every(r=>r&&r.left>=outer.left-2&&r.right<=outer.right+2&&r.top>=outer.top-2&&r.bottom<=outer.bottom+2)
      const pic=c.querySelector('img')
      return {href:c.getAttribute('href'),img:pic?.getAttribute('src'),loaded:!!pic?.naturalWidth,within,card:{x:outer.x,y:outer.y,w:outer.width,h:outer.height},label:c.textContent.trim().slice(0,100)}
    })
    const colors={body:getComputedStyle(main).color, background:getComputedStyle(main).backgroundImage.slice(0,150),footer:getComputedStyle(document.querySelector('.portal-footer')).color}
    const sk=document.querySelector('.xk-skip-link'); const sr=sk?.getBoundingClientRect();
    const skipVisible=!!sr&&sr.bottom>0&&sr.top<innerHeight&&sr.right>0;
    return {skipVisible, skipFocus:sk===document.activeElement,skipFocusVisible:sk?.matches(':focus-visible'),overflow:document.documentElement.scrollWidth-innerWidth, cards:boxes, duplicateGreen:document.querySelectorAll('.xk-launcher-green').length, wordmark:document.querySelector('.xk-light-wordmark')?.textContent,hasAionTabs:document.querySelectorAll('.xk-universe-tabs button').length, colors, footerVisible:!!document.querySelector('.portal-footer')}
  })
  let pass=response.status()===200&&diag.overflow<=1&&diag.cards.length===4&&diag.cards.every(c=>c.loaded&&c.within)&&diag.duplicateGreen===0&&!diag.skipVisible&&diag.hasAionTabs===2&&jsErrors.length===0
  failed ||= !pass
  if(!pass) issues.push({width,where:'Home',diag,jsErrors})
  if([390,768,1440].includes(width)){
    await page.evaluate(()=>window.scrollTo(0,0))
    await page.screenshot({path:path.join(dest,'first-view-'+width+'.png'),fullPage:false,animations:'disabled'})
    await page.screenshot({path:path.join(dest,'home-'+width+'.png'),fullPage:true,animations:'disabled'})
    await page.locator('.xk-light-worlds').screenshot({path:path.join(dest,'portals-'+width+'.png'),animations:'disabled'})
  }
  log({viewport:width,homePass:pass,diag,jsErrors})
  // AION and WoWForever share one hero and must remain accessible.
  await page.getByRole('tab',{name:/WOWFOREVER/i}).click()
  const selected=await page.getByRole('tab',{name:/WOWFOREVER/i}).getAttribute('aria-selected')
  const wowShown=await page.locator('#universe-panel').innerText()
  if(selected!=='true'||!wowShown.replace(/\s+/g,'').includes('WOWFOREVER')) {failed=true;issues.push({width,where:'Wow tab'})}
  await page.getByRole('tab',{name:/AION 2/i}).click()
  await page.locator('.xk-universe-archive-toggle__button').click()
  let opened=await page.locator('.xk-universe-archive-toggle__button').getAttribute('aria-expanded')
  const archiveVisible=await page.locator('#xk-universe-archive-content').isVisible()
  if(opened!=='true'||!archiveVisible){failed=true;issues.push({width,where:'Archive'})}
  log({viewport:width,tabs:true,archive:archiveVisible})
  if(width===390||width===1440){
    const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
    const v=axe.violations.map(o=>({id:o.id,impact:o.impact,nodes:o.nodes.length,first:o.nodes[0]?.target}))
    log({viewport:width,homeAxe:v})
    if(v.length){failed=true;issues.push({width,where:'Home axe',violations:v})}
  }
  await ctx.close()
}
for(const item of allRoutes){
  const ctx=await browser.newContext({viewport:{width:390,height:844},locale:'es-AR',reducedMotion:'reduce'})
  const page=await ctx.newPage()
  const jsErrors=[]
  page.on('pageerror',e=>jsErrors.push(e.message))
  let status=null
  try{
    const response=await page.goto(base+item.url,{waitUntil:'domcontentloaded',timeout:35000})
    status=response.status()
    await page.waitForTimeout(item.url==='/green-node'?2700:400)
    await closePrivacyDialog(page)
    const data=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,title:document.title,bodyText:document.body.innerText.slice(0,160),background:document.querySelector('main')?getComputedStyle(document.querySelector('main')).backgroundImage.slice(0,120):'static'}))
    const pass=status===200 && data.overflow<=1 && jsErrors.length===0
    failed ||= !pass
    if(!pass) issues.push({where:item.kind,status,data,jsErrors})
    await page.screenshot({path:path.join(dest,'interior-'+item.kind.toLowerCase().replace(/\W+/g,'-')+'.png'),fullPage:false,animations:'disabled'})
    log({route:item.url,status,pass,data,jsErrors})
    if(['/digital','/world-of-xethkioz/elemental-realms','/green-node','/mascotas/'].includes(item.url)){
      const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
      const v=axe.violations.map(o=>({id:o.id,impact:o.impact,nodes:o.nodes.length,first:o.nodes[0]?.target}))
      log({route:item.url,axe:v})
      if(v.length){failed=true;issues.push({where:item.kind+' axe',violations:v})}
    }
  }catch(e){failed=true;issues.push({where:item.kind,error:String(e)});log({route:item.url,error:String(e)})}
  await ctx.close()
}
await browser.close()
fs.writeFileSync(path.join(dest,'results.json'),JSON.stringify({ok:!failed,issues,finished:new Date().toISOString()},null,2))
log({final:'FULL LUMINOUS QA',pass:!failed,issues,location:dest})
process.exitCode=failed?2:0
