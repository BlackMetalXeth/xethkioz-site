import { chromium } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs'
import path from 'node:path'

const base = 'http://127.0.0.1:4174/'
const out = 'E:\\WEB XETHKIOZ\\03_EXPORTS_QA\\GREEN_NODE_CELESTIAL_PRODUCTION_20261011'
fs.mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
let failed = false
for (const width of [320, 360, 390, 768, 1024, 1440]) {
  const ctx = await browser.newContext({ viewport: { width, height: 880 }, locale: 'es-AR', reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 35000 })
  const card = page.locator('a.xk-launcher-green')
  await card.waitFor({ timeout: 20000 })
  const consent = page.getByRole('button', { name: /solo esenciales/i })
  if (await consent.count()) try { await consent.click({ timeout: 1000 }) } catch {}
  const diag = await page.evaluate(() => {
    const rect = e => { if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom } }
    const card = document.querySelector('a.xk-launcher-green')
    const cr = rect(card)
    const inner = ['.xk-launcher-green__mark', '.xk-launcher-green__copy', '.xk-launcher-green__action'].map(q => rect(card.querySelector(q)))
    const within = r => r && r.l >= cr.l - 2 && r.r <= cr.r + 2 && r.t >= cr.t - 2 && r.b <= cr.b + 2
    const overlap = (a,b) => a && b && a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t
    const img = card.querySelector('img')
    return {
      overflow: document.documentElement.scrollWidth - innerWidth,
      greenCount: document.querySelectorAll('a.xk-launcher-green').length,
      href: card.getAttribute('href'),
      asset: img.getAttribute('src'),
      assetLoaded: img.complete && img.naturalWidth > 0,
      contained: inner.every(within),
      textOverlaps: overlap(inner[0], inner[1]) || overlap(inner[1], inner[2]) || overlap(inner[0], inner[2]),
      title: card.querySelector('.xk-launcher-green__copy b')?.textContent,
      background: getComputedStyle(card).backgroundColor
    }
  })
  const pass = diag.overflow <= 2 && diag.greenCount === 1 && diag.href === '/green-node' && diag.assetLoaded && diag.contained && !diag.textOverlaps && diag.title === 'GREEN NODE' && errors.length === 0
  failed ||= !pass
  if ([390, 1440].includes(width)) await card.screenshot({ path: path.join(out, 'green-node-' + width + '.png'), animations: 'disabled' })
  console.log(JSON.stringify({ width, pass, diag, errors }))
  if (width === 1440) {
    const a = await new AxeBuilder({ page }).include('.xk-launcher-green').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
    console.log(JSON.stringify({ greenAxeViolations: a.violations.map(v => ({ id: v.id, impact: v.impact, count: v.nodes.length })) }))
    failed ||= a.violations.length > 0
  }
  await card.click({ timeout: 10000 })
  await page.waitForURL(/\/green-node(?:\/|$)/, { timeout: 10000 })
  console.log(JSON.stringify({ width, greenNavigation: page.url() }))
  await ctx.close()
}
await browser.close()
process.exitCode = failed ? 2 : 0
