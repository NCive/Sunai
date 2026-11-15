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

const OUT_DIR = path.resolve(__dirname, '../../../landing_checks');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
  });

  const page = await browser.newPage();

  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5174/#demo', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));

    const shotPath = path.join(OUT_DIR, `before_slide14_${vp.name}.png`);
    await page.screenshot({ path: shotPath });
    console.log(`Captured before screenshot: ${shotPath}`);
  }

  await browser.close();
}

run().catch(console.error);
