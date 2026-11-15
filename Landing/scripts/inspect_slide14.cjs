const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const VIEWPORTS = [
  { name: '1920x970', width: 1920, height: 970 },
  { name: '1536x730', width: 1536, height: 730 },
  { name: '1366x650', width: 1366, height: 650 },
  { name: '1280x620', width: 1280, height: 620 },
];

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
  });

  const page = await browser.newPage();

  console.log('--- SLIDE 14 METRICS ---');
  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5174/#demo', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));

    const metrics = await page.evaluate(() => {
      const slide = document.querySelector('#demo');
      if (!slide) return null;
      const title = slide.querySelector('h2');
      const subtitle = slide.querySelector('p');
      const videoPanel = slide.querySelector('.md\\:col-span-7');
      const runPanel = slide.querySelector('.md\\:col-span-5');
      const topHud = document.querySelector('header');
      const bottomControls = document.querySelector('.fixed.bottom-4.right-4');

      return {
        winH: window.innerHeight,
        topHudBottom: topHud ? topHud.getBoundingClientRect().bottom : 0,
        bottomControlsTop: bottomControls ? bottomControls.getBoundingClientRect().top : window.innerHeight,
        titleBottom: title ? title.getBoundingClientRect().bottom : 0,
        subtitleBottom: subtitle ? subtitle.getBoundingClientRect().bottom : 0,
        videoPanelTop: videoPanel ? videoPanel.getBoundingClientRect().top : 0,
        videoPanelBottom: videoPanel ? videoPanel.getBoundingClientRect().bottom : 0,
        videoPanelH: videoPanel ? videoPanel.clientHeight : 0,
        runPanelH: runPanel ? runPanel.clientHeight : 0,
        clearanceBottom: bottomControls ? bottomControls.getBoundingClientRect().top - (videoPanel ? videoPanel.getBoundingClientRect().bottom : 0) : null,
      };
    });

    console.log(vp.name, metrics);
  }

  await browser.close();
}

run().catch(console.error);
