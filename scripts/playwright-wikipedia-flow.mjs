import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'screenshots', 'playwright', 'wikipedia-flow');
const BASE_URL = process.env.MARKEDUP_BASE_URL || 'http://127.0.0.1:4788';

const WIKI_PAGES = [
  { slug: 'wikipedia-home', url: 'https://www.wikipedia.org/' },
  { slug: 'artificial-intelligence', url: 'https://en.wikipedia.org/wiki/Artificial_intelligence' },
  { slug: 'alan-turing', url: 'https://en.wikipedia.org/wiki/Alan_Turing' }
];

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function waitForServiceReady(baseUrl, timeoutMs = 30000) {
  const start = Date.now();
  let lastError = '';

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) return;
      lastError = `Health returned ${res.status}`;
    } catch (err) {
      lastError = err && err.message ? err.message : String(err);
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  throw new Error(`Service did not become ready at ${baseUrl}: ${lastError}`);
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch (primaryErr) {
    console.warn(`Default Chromium launch failed: ${primaryErr.message}`);
    try {
      return await chromium.launch({ headless: true, channel: 'chrome' });
    } catch (chromeErr) {
      console.warn(`Chrome channel launch failed: ${chromeErr.message}`);
      return chromium.launch({ headless: true, channel: 'msedge' });
    }
  }
}

async function waitForAppReady(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('#mainViewport', { state: 'visible', timeout: 30000 });
  await page.waitForSelector('#btnBrowse', { state: 'attached', timeout: 30000 });
  await page.waitForSelector('#captureBtn', { state: 'attached', timeout: 30000 });
  await page.waitForTimeout(2500);
}

async function screenshot(page, name, waitMs = 1400) {
  await page.waitForTimeout(waitMs);
  const target = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: target, fullPage: true });
  console.log(`Saved ${target}`);
}

async function browsePage(page, url) {
  await page.evaluate(() => App.setView('browse'));
  await page.fill('#urlInput', url);
  await page.click('#goBtn');

  await page.waitForSelector('#webFrame', { state: 'attached', timeout: 15000 });
  await page.waitForTimeout(4000);
}

async function captureCurrentBrowse(page) {
  const beforeCount = await page.evaluate(() => {
    return Array.isArray(Library.captures) ? Library.captures.length : 0;
  });

  await page.click('#captureBtn');

  await page.waitForFunction(
    (prev) => Array.isArray(Library.captures) && Library.captures.length > prev,
    beforeCount,
    { timeout: 90000 }
  );

  await page.waitForTimeout(1800);
}

async function openLatestCaptureInMarkup(page) {
  await page.evaluate(async () => {
    const latest = Library.captures[0];
    if (!latest) throw new Error('No capture exists to open in markup view');
    await Library.loadCapture(latest.id);
    App.setView('markup');
  });

  await page.waitForTimeout(2200);
}

async function annotateLatestCapture(page, label, order) {
  await page.evaluate(async ({ label, order }) => {
    if (!Editor.session) throw new Error('Editor session not available for annotation');

    const baseX = 80 + (order * 15);
    const baseY = 80 + (order * 20);

    Editor.session.shapes.push({
      id: Utils.uid(),
      type: 'rect',
      x: baseX,
      y: baseY,
      w: 480,
      h: 210,
      stroke: '#dc2626',
      strokeWidth: 6,
      fill: 'transparent'
    });

    Editor.session.shapes.push({
      id: Utils.uid(),
      type: 'arrow',
      x: baseX + 500,
      y: baseY + 50,
      x2: baseX + 740,
      y2: baseY + 180,
      stroke: '#0369a1',
      strokeWidth: 8,
      fill: 'transparent'
    });

    Editor.session.shapes.push({
      id: Utils.uid(),
      type: 'text',
      x: baseX + 520,
      y: baseY + 190,
      w: 560,
      h: 120,
      text: `Review notes: ${label}`,
      stroke: '#111827',
      fill: 'transparent',
      strokeWidth: 2,
      fontSize: 30,
      fontWeight: 700,
      fontFamily: 'Inter, sans-serif'
    });

    Editor.session.shapes.push({
      id: Utils.uid(),
      type: 'point',
      x: baseX + 760,
      y: baseY + 24,
      stroke: '#16a34a',
      strokeWidth: 4,
      note: `Captured and reviewed page: ${label}`,
      order,
      collapsed: false
    });

    Editor.draw();
    Editor.updateLayers();
    Notes.toggle(true);
    Notes.render();
    await Library.saveCurrentCapture();
  }, { label, order });

  await page.waitForTimeout(1200);
}

async function run() {
  await ensureDir(OUT_DIR);
  await waitForServiceReady(BASE_URL);

  const browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 1720, height: 980 } });
  const page = await context.newPage();

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForAppReady(page);

    await screenshot(page, '00-app-loaded-home', 1200);

    for (let i = 0; i < WIKI_PAGES.length; i += 1) {
      const item = WIKI_PAGES[i];
      const index = i + 1;

      await browsePage(page, item.url);
      await screenshot(page, `${index}1-browse-${item.slug}`, 1500);

      await captureCurrentBrowse(page);
      await openLatestCaptureInMarkup(page);
      await annotateLatestCapture(page, item.slug.replace(/-/g, ' '), index);
      await screenshot(page, `${index}2-markup-${item.slug}`, 1500);
    }

    await page.evaluate(() => {
      App.setView('library');
      Library.setTab('captures');
      Library.captures.forEach((c) => {
        c.selected = true;
      });
      Library.render();
    });
    await screenshot(page, '40-library-overview-multiple-captures', 1500);

    await page.evaluate(() => {
      Exporter.showDialog();
    });
    await page.waitForSelector('#exportModal.open', { timeout: 10000 });
    await screenshot(page, '50-export-selected-captures', 1200);
    await page.evaluate(() => Modal.close('exportModal'));
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
