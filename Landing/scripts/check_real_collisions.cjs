const puppeteer = require('puppeteer-core');

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

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
  });

  const page = await browser.newPage();
  const realCollisions = [];

  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    for (let i = 0; i < SLIDE_IDS.length; i++) {
      const id = SLIDE_IDS[i];
      const slideNum = (i + 1).toString().padStart(2, '0');
      const url = `http://localhost:5174/#${id}`;
      await page.goto(url, { waitUntil: 'networkidle0' });
      await new Promise((r) => setTimeout(r, 400));

      const check = await page.evaluate(() => {
        const slideEl = document.querySelector('[role="region"][aria-roledescription="slide"]');
        if (!slideEl) return null;
        const mainBody = slideEl.querySelector('.flex-1');
        if (!mainBody || !mainBody.firstElementChild) return null;
        const contentChild = mainBody.firstElementChild;
        const contentRect = contentChild.getBoundingClientRect();
        const bottomControls = document.querySelector('.fixed.bottom-4.right-4');
        const bottomControlsTop = bottomControls ? bottomControls.getBoundingClientRect().top : window.innerHeight;

        return {
          contentTop: contentRect.top,
          contentBottom: contentRect.bottom,
          bottomControlsTop,
          isColliding: contentRect.bottom > bottomControlsTop,
        };
      });

      if (check && check.isColliding) {
        realCollisions.push({
          slideNum,
          id,
          viewport: vp.name,
          check,
        });
      }
    }
  }

  await browser.close();
  console.log(`REAL CONTENT COLLISIONS: ${realCollisions.length}`);
  console.log(JSON.stringify(realCollisions, null, 2));
}

run().catch(console.error);
