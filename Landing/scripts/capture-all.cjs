const puppeteer = require('../node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const SHOTS_DIR = 'Sunai/Landing/public/screenshots/theme-verify';
if (!fs.existsSync(SHOTS_DIR)) {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
}

async function run() {
  console.log('=== RUNNING COMPREHENSIVE SCREENSHOT & PALETTE CAPTURE ===\n');

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--enable-gpu-benchmarking',
    ],
  });

  const errors = [];
  const warnings = [];

  const page = await browser.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.error('[Browser Error]', msg.text());
    }
    if (msg.type() === 'warning') {
      warnings.push(msg.text());
      console.warn('[Browser Warning]', msg.text());
    }
  });
  page.on('pageerror', err => {
    errors.push(err.toString());
    console.error('[Page Error]', err);
  });

  // 1. FRONTEND IDLE AT 1440x900
  console.log('1. Loading Frontend at 1440x900 (http://localhost:5173)...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  const feIdlePath = path.join(SHOTS_DIR, 'frontend-idle-1440x900.png');
  await page.screenshot({ path: feIdlePath });
  console.log('   Captured Frontend Idle 1440x900 ->', feIdlePath);

  // Copy to assistant-running-5173.png
  const assistantRunningPath = 'Sunai/Landing/public/screenshots/assistant-running-5173.png';
  fs.copyFileSync(feIdlePath, assistantRunningPath);
  console.log('   Updated assistant screenshot for Landing ->', assistantRunningPath);

  // 2. LANDING PRESENTATION DECK AT 1440x900
  console.log('\n2. Loading Landing Deck at 1440x900 (http://localhost:5174)...');
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  // Slide 1
  const slide1Path = path.join(SHOTS_DIR, 'landing-slide-01-hero-1440x900.png');
  await page.screenshot({ path: slide1Path });
  console.log('   Slide 01 (Hero) 1440x900 ->', slide1Path);

  // Jump to Slide 3 (Pause First)
  await page.evaluate(() => {
    const railButtons = document.querySelectorAll('nav[aria-label="Slide Progress Rail"] button');
    if (railButtons[2]) railButtons[2].click();
  });
  await new Promise(r => setTimeout(r, 1200));
  const slide3Path = path.join(SHOTS_DIR, 'landing-slide-03-pause-first-1440x900.png');
  await page.screenshot({ path: slide3Path });
  console.log('   Slide 03 (Pause First) 1440x900 ->', slide3Path);

  // Jump to Slide 8 (Architecture)
  await page.evaluate(() => {
    const railButtons = document.querySelectorAll('nav[aria-label="Slide Progress Rail"] button');
    if (railButtons[7]) railButtons[7].click();
  });
  await new Promise(r => setTimeout(r, 1200));
  const slide8Path = path.join(SHOTS_DIR, 'landing-slide-08-architecture-1440x900.png');
  await page.screenshot({ path: slide8Path });
  console.log('   Slide 08 (Architecture) 1440x900 ->', slide8Path);

  // Jump to Slide 16 (Closing)
  await page.evaluate(() => {
    const railButtons = document.querySelectorAll('nav[aria-label="Slide Progress Rail"] button');
    if (railButtons[15]) railButtons[15].click();
  });
  await new Promise(r => setTimeout(r, 1200));
  const slide16Path = path.join(SHOTS_DIR, 'landing-slide-16-closing-1440x900.png');
  await page.screenshot({ path: slide16Path });
  console.log('   Slide 16 (Closing) 1440x900 ->', slide16Path);

  await browser.close();

  console.log('\nConsole Errors:', errors.length);
  console.log('Console Warnings:', warnings.length);

  if (errors.length > 0) {
    console.error('Errors found:', errors);
    process.exit(1);
  }
  console.log('Screenshots and validation completed successfully!\n');
}

run().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});

