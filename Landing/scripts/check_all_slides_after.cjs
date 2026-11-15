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

const OUT_DIR = path.resolve(__dirname, '../../../landing_checks/all_slides_after');
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
  const report = [];

  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    for (let i = 0; i < SLIDE_IDS.length; i++) {
      const id = SLIDE_IDS[i];
      const slideNum = (i + 1).toString().padStart(2, '0');
      const url = `http://localhost:5174/#${id}`;
      await page.goto(url, { waitUntil: 'networkidle0' });
      await new Promise((r) => setTimeout(r, 600));

      const screenshotName = `after_slide_${slideNum}_${id}_${vp.name}.png`;
      const screenshotPath = path.join(OUT_DIR, screenshotName);
      await page.screenshot({ path: screenshotPath });

      const info = await page.evaluate(() => {
        const slideEl = document.querySelector('[role="region"][aria-roledescription="slide"]');
        if (!slideEl) return null;
        const header = slideEl.querySelector('.flex-shrink-0');
        const mainBody = slideEl.querySelector('.flex-1');
        const topHud = document.querySelector('header');
        const bottomControls = document.querySelector('.fixed.bottom-4.right-4');

        const headerRect = header ? header.getBoundingClientRect() : null;
        const bodyRect = mainBody ? mainBody.getBoundingClientRect() : null;
        const topHudBottom = topHud ? topHud.getBoundingClientRect().bottom : 0;
        const bottomControlsTop = bottomControls ? bottomControls.getBoundingClientRect().top : window.innerHeight;

        return {
          headerTop: headerRect ? headerRect.top : 0,
          headerBottom: headerRect ? headerRect.bottom : 0,
          bodyTop: bodyRect ? bodyRect.top : 0,
          bodyBottom: bodyRect ? bodyRect.bottom : 0,
          topHudBottom,
          bottomControlsTop,
          bodyScrollHeight: mainBody ? mainBody.scrollHeight : 0,
          bodyClientHeight: mainBody ? mainBody.clientHeight : 0,
          overlapsTopHud: headerRect ? headerRect.top < topHudBottom : false,
          overlapsBottomControls: bodyRect ? bodyRect.bottom > bottomControlsTop : false,
        };
      });

      report.push({
        slideNum,
        id,
        viewport: vp.name,
        info,
      });
    }
  }

  await browser.close();
  console.log('Finished capturing and inspecting all 16 slides.');

  const regressions = report.filter(
    (r) => r.info && (r.info.overlapsTopHud || (r.info.overlapsBottomControls && r.id !== 'problem'))
  );
  console.log(`Regressions found: ${regressions.length}`);
  if (regressions.length > 0) {
    console.log(JSON.stringify(regressions, null, 2));
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
