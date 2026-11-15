const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const VIEWPORTS = [
  { name: '1920x970', width: 1920, height: 970 },
  { name: '1536x730', width: 1536, height: 730 },
  { name: '1366x650', width: 1366, height: 650 },
  { name: '1280x620', width: 1280, height: 620 },
];

const SLIDE_IDS = [
  'hero',
  'problem',
  'pause-first',
  'outcomes',
  'simulation',
  'decision-window',
  'state-machine',
  'architecture',
  'multilingual',
  'hardware',
  'demo',
  'failure-modes',
  'metrics',
  'production',
  'deep-dive',
  'closing',
];

const OUT_DIR = path.resolve(__dirname, '../../../landing_checks/all_slides');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();

  const issues = [];

  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    for (let i = 0; i < SLIDE_IDS.length; i++) {
      const id = SLIDE_IDS[i];
      const slideNum = (i + 1).toString().padStart(2, '0');
      const url = `http://localhost:5174/#${id}`;
      await page.goto(url, { waitUntil: 'networkidle0' });
      await new Promise((r) => setTimeout(r, 600));

      const screenshotName = `slide_${slideNum}_${id}_${vp.name}.png`;
      const screenshotPath = path.join(OUT_DIR, screenshotName);
      await page.screenshot({ path: screenshotPath });

      // Check DOM scrollHeight vs clientHeight in slide
      const overflowInfo = await page.evaluate(() => {
        const slideEl = document.querySelector('[role="region"][aria-roledescription="slide"]');
        if (!slideEl) return null;
        const mainBody = slideEl.querySelector('.flex-1');
        return {
          slideScrollHeight: slideEl.scrollHeight,
          slideClientHeight: slideEl.clientHeight,
          bodyScrollHeight: mainBody ? mainBody.scrollHeight : 0,
          bodyClientHeight: mainBody ? mainBody.clientHeight : 0,
          isOverflowing: mainBody ? mainBody.scrollHeight > mainBody.clientHeight + 4 : false,
        };
      });

      if (overflowInfo && overflowInfo.isOverflowing) {
        issues.push({
          slideNum,
          id,
          viewport: vp.name,
          screenshotName,
          overflowInfo,
        });
      }
    }
  }

  await browser.close();
  console.log('Finished capturing all slides.');
  console.log('Overflow issues detected:', JSON.stringify(issues, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
