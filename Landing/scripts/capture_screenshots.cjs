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
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();

  // Test Slide 2 (#problem) and Slide 4 (#outcomes)
  const targets = [
    { slide: 'slide2', hash: 'problem' },
    { slide: 'slide4', hash: 'outcomes' },
  ];

  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    for (const target of targets) {
      const url = `http://localhost:5174/#${target.hash}`;
      await page.goto(url, { waitUntil: 'networkidle0' });
      await new Promise((r) => setTimeout(r, 1200));

      const screenshotPath = path.join(
        OUT_DIR,
        `before_${target.slide}_${vp.name}.png`
      );
      await page.screenshot({ path: screenshotPath });
      console.log(`Captured: ${screenshotPath}`);
    }
  }

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
