import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = path.resolve('public/screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function run() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Test 1: Desktop 1440px
  console.log('Testing 1440px desktop...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });

  // Capture full page desktop
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'desktop-full.png'),
    fullPage: true,
  });

  // Test Assistant Offline Popover
  console.log('Testing assistant offline state & popover...');
  // Assistant is stopped, so status dot should be grey
  await page.waitForSelector('a[aria-label="Open the Sunai voice assistant"]');
  
  // Click navbar Voice Assistant button
  const navBtn = await page.$('nav a[aria-label="Open the Sunai voice assistant"]');
  if (navBtn) {
    await navBtn.click();
    await new Promise((r) => setTimeout(r, 600)); // wait for popover animation
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'offline-popover.png'),
    });
    console.log('Captured offline popover screenshot');

    // Close modal
    const closeBtn = await page.$('button[aria-label="Close dialog"]');
    if (closeBtn) await closeBtn.click();
    await new Promise((r) => setTimeout(r, 400));
  }

  // Section-by-section desktop screenshots
  const sections = [
    'problem',
    'how-it-works',
    'simulation',
    'features',
    'languages',
    'architecture',
    'pipeline',
    'hardware',
    'demo',
    'team',
  ];

  for (const sec of sections) {
    const el = await page.$(`#${sec}`);
    if (el) {
      await el.screenshot({
        path: path.join(SCREENSHOTS_DIR, `desktop-${sec}.png`),
      });
      console.log(`Captured desktop ${sec}`);
    }
  }

  // Test 2: Mobile 390px (iPhone 14 / modern phone standard)
  console.log('Testing 390px mobile...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });

  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'mobile-full.png'),
    fullPage: true,
  });

  for (const sec of sections) {
    const el = await page.$(`#${sec}`);
    if (el) {
      await el.screenshot({
        path: path.join(SCREENSHOTS_DIR, `mobile-${sec}.png`),
      });
      console.log(`Captured mobile ${sec}`);
    }
  }

  console.log('All screenshots captured successfully!');
  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
