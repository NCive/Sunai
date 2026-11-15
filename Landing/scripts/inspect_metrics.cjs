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

  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5174/#problem', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));

    const metrics = await page.evaluate(() => {
      const slide = document.querySelector('#problem');
      const title = slide.querySelector('h2');
      const cards = slide.querySelectorAll('.deck-card');
      const lanes = slide.querySelectorAll('.grid-cols-12');
      const lastLane = lanes[lanes.length - 1];
      const winH = window.innerHeight;
      const topHud = document.querySelector('header');
      const bottomControls = document.querySelector('.fixed.bottom-4.right-4');

      return {
        winH,
        topHudBottom: topHud ? topHud.getBoundingClientRect().bottom : 0,
        bottomControlsTop: bottomControls ? bottomControls.getBoundingClientRect().top : winH,
        titleTop: title.getBoundingClientRect().top,
        titleBottom: title.getBoundingClientRect().bottom,
        card0Top: cards[0] ? cards[0].getBoundingClientRect().top : 0,
        card0Bottom: cards[0] ? cards[0].getBoundingClientRect().bottom : 0,
        lastLaneTop: lastLane ? lastLane.getBoundingClientRect().top : 0,
        lastLaneBottom: lastLane ? lastLane.getBoundingClientRect().bottom : 0,
        isLaneCutOff: lastLane ? lastLane.getBoundingClientRect().bottom > winH : false,
      };
    });

    console.log(vp.name, metrics);
  }

  await browser.close();
}

run().catch(console.error);
