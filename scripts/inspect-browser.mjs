import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { writeFile, mkdir } from 'node:fs/promises';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = {
  browser: browser.version(),
  at: new Date().toISOString(),
  accessibility: [],
  performance: [],
};
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } }),
  page = await context.newPage();
for (const path of ['/', '/products/echo-headphones/', '/cart/', '/demo-info/']) {
  await page.goto(`http://localhost:3017${path}`);
  await page.getByRole('link', { name: 'Cart, 0 items' }).waitFor();
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  report.accessibility.push({
    path,
    violations: r.violations.map((x) => ({
      id: x.id,
      impact: x.impact,
      help: x.help,
      nodes: x.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  });
  if (path === '/')
    await page.screenshot({ path: 'artifacts/catalog-desktop.png', fullPage: true });
}
await page.goto('http://localhost:3017/products/echo-headphones/');
await page.getByRole('button', { name: 'Black', exact: true }).click();
await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
await page.getByRole('link', { name: 'View cart', exact: true }).waitFor();
for (const path of ['/cart/', '/checkout/']) {
  await page.goto(`http://localhost:3017${path}`);
  await page.getByRole('link', { name: 'Cart, 1 items' }).waitFor();
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  report.accessibility.push({
    path: path + ' (populated)',
    violations: r.violations.map((x) => ({
      id: x.id,
      impact: x.impact,
      help: x.help,
      nodes: x.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  });
}
await page.setViewportSize({ width: 390, height: 844 });
await page.goto('http://localhost:3017/');
await page.getByRole('link', { name: 'Cart, 1 items' }).waitFor();
await page.screenshot({ path: 'artifacts/catalog-mobile.png', fullPage: true });
await context.close();
for (let i = 0; i < 3; i++) {
  const c = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
    }),
    p = await c.newPage(),
    session = await c.newCDPSession(p);
  await session.send('Network.enable');
  await session.send('Network.setCacheDisabled', { cacheDisabled: true });
  await session.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (4 * 1000000) / 8,
    uploadThroughput: 1000000 / 8,
  });
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.addInitScript(() => {
    window.__metrics = { lcp: 0, cls: 0 };
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__metrics.lcp = e.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__metrics.cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await p.goto('http://localhost:3017/');
  await p.getByRole('link', { name: 'Cart, 0 items' }).waitFor();
  await p.locator('.product-grid img').first().waitFor();
  await p.waitForTimeout(3000);
  report.performance.push(await p.evaluate(() => window.__metrics));
  await c.close();
}
await writeFile('artifacts/browser-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
