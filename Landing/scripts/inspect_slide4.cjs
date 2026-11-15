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

  console.log('--- SLIDE 4 METRICS ---');
  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5174/#outcomes', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));

    const metrics = await page.evaluate(() => {
      const slide = document.querySelector('#outcomes');
      const title = slide.querySelector('h2');
      const subtitle = slide.querySelector('p');
      const cards = slide.querySelectorAll('.deck-card');
      const winH = window.innerHeight;

      return {
        winH,
        titleBottom: title.getBoundingClientRect().bottom,
        subtitleBottom: subtitle ? subtitle.getBoundingClientRect().bottom : null,
        card0Top: cards[0] ? cards[0].getBoundingClientRect().top : 0,
        card0Bottom: cards[0] ? cards[0].getBoundingClientRect().bottom : 0,
        gapBetweenSubAndCards: cards[0] && subtitle ? cards[0].getBoundingClientRect().top - subtitle.getBoundingClientRect().bottom : null,
      };
    });

    console.log(vp.name, metrics);
  }

  await browser.close();
}

run().catch(console.error);
