import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

async function testFrames() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));

  const outDir = path.resolve('public/screenshots/flicker-test');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log('Capturing sequential frames across Slide 1 -> 2 transition boundary...');

  // Slide 1 offset: 0, hold 60vh (540px), trans 40vh (360px)
  // Transition starts at 540px and ends at 900px.
  // We'll capture frames from 500px to 950px in 20px steps
  for (let y = 500; y <= 950; y += 25) {
    await page.evaluate((top) => {
      window.scrollTo({ top, behavior: 'instant' });
    }, y);
    await new Promise((r) => setTimeout(r, 60));
    await page.screenshot({ path: path.join(outDir, `frame-y${y}.png`) });
  }

  console.log('Frames captured in public/screenshots/flicker-test');
  await browser.close();
}

testFrames().catch(err => {
  console.error(err);
  process.exit(1);
});

