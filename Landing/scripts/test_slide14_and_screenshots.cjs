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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('--- STARTING SLIDE 14 TESTS & SCREENSHOT CAPTURES ---');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // 1. Capture Before & After screenshots at each viewport
  console.log('\n[PHASE 1] Capturing Placeholder & Playing Screenshots across 4 Viewports...');
  for (const vp of VIEWPORTS) {
    console.log(`\nTesting viewport: ${vp.name} (${vp.width}x${vp.height})`);
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5174/#demo', { waitUntil: 'networkidle0' });
    await sleep(1500);

    // Verify placeholder is present
    const placeholderShotPath = path.join(OUT_DIR, `after_slide14_placeholder_${vp.name}.png`);
    await page.screenshot({ path: placeholderShotPath });
    console.log(`  Saved placeholder screenshot: ${placeholderShotPath}`);

    // Click play button
    const playBtn = await page.$('button[aria-label="Play demonstration video"]');
    if (!playBtn) {
      throw new Error(`Play button not found at viewport ${vp.name}`);
    }
    await playBtn.click();
    await sleep(800);

    // Verify iframe exists
    const iframeHandle = await page.$('iframe[title="Sunai demo video"]');
    if (!iframeHandle) {
      throw new Error(`Iframe not found after clicking play at viewport ${vp.name}`);
    }

    const iframeAttrs = await page.evaluate(() => {
      const iframe = document.querySelector('iframe[title="Sunai demo video"]');
      if (!iframe) return null;
      const rect = iframe.getBoundingClientRect();
      const parentRect = iframe.parentElement ? iframe.parentElement.getBoundingClientRect() : null;
      return {
        src: iframe.getAttribute('src'),
        allow: iframe.getAttribute('allow'),
        title: iframe.getAttribute('title'),
        allowFullScreen: iframe.hasAttribute('allowfullscreen'),
        width: rect.width,
        height: rect.height,
        aspectRatio: (rect.width / rect.height).toFixed(3),
        parentWidth: parentRect ? parentRect.width : 0,
        parentHeight: parentRect ? parentRect.height : 0,
      };
    });

    console.log(`  Iframe attributes & metrics:`, iframeAttrs);

    if (!iframeAttrs.src.includes('https://drive.google.com/file/d/1tJ_N9ztI08ZV5Y7xWpVXvE_Kf9ArqGpl/preview')) {
      throw new Error(`Iframe src incorrect: ${iframeAttrs.src}`);
    }
    if (iframeAttrs.allow !== 'autoplay; fullscreen') {
      throw new Error(`Iframe allow incorrect: ${iframeAttrs.allow}`);
    }
    if (!iframeAttrs.allowFullScreen) {
      throw new Error('Iframe allowFullScreen attribute missing');
    }

    const playingShotPath = path.join(OUT_DIR, `after_slide14_playing_${vp.name}.png`);
    await page.screenshot({ path: playingShotPath });
    console.log(`  Saved playing screenshot: ${playingShotPath}`);

    await page.close();
  }

  // 2. Functional Lifecycle & Autoplay Test
  console.log('\n[PHASE 2] Automated Lifecycle & Autoplay Verification Test...');
  const testPage = await browser.newPage();
  await testPage.setViewport({ width: 1920, height: 970 });
  await testPage.goto('http://localhost:5174/#demo', { waitUntil: 'networkidle0' });
  await sleep(1500);

  async function isAutoplayActive() {
    return await testPage.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Toggle Autoplay Presentation"]');
      return btn ? btn.querySelector('svg.lucide-pause') !== null : false;
    });
  }

  // Ensure autoplay is ON first to test that clicking play stops it
  let autoplay = await isAutoplayActive();
  if (!autoplay) {
    console.log('Turning deck autoplay ON for the test...');
    await testPage.click('button[aria-label="Toggle Autoplay Presentation"]');
    await sleep(400);
    autoplay = await isAutoplayActive();
    console.log('Autoplay state now:', autoplay);
    if (!autoplay) {
      throw new Error('Failed to turn autoplay ON');
    }
  }

  console.log('Step A: Click play on Slide 14 demo...');
  const playBtn = await testPage.$('button[aria-label="Play demonstration video"]');
  if (!playBtn) throw new Error('Play button not found');
  await playBtn.click();
  await sleep(600);

  // Check iframe exists
  const iframeMounted = await testPage.$('iframe[title="Sunai demo video"]');
  if (!iframeMounted) throw new Error('Assertion failed: iframe was not mounted');
  console.log('  -> PASS: Iframe mounted successfully.');

  // Check autoplay stopped
  const autoplayAfterPlay = await isAutoplayActive();
  console.log('  -> Autoplay active after play clicked:', autoplayAfterPlay);
  if (autoplayAfterPlay) throw new Error('Assertion failed: deck autoplay was not stopped by video play');
  console.log('  -> PASS: Deck autoplay was stopped.');

  // Step B: Navigate away to another slide (e.g. click Next slide button in HUD)
  console.log('Step B: Navigating away to slide 15 using next button...');
  const nextBtn = await testPage.$('button[aria-label="Next slide"]');
  if (nextBtn) {
    await nextBtn.click();
  } else {
    await testPage.evaluate(() => window.location.hash = '#team');
  }
  await sleep(1500);

  // Check iframe is completely unmounted from DOM
  const iframeWhileAway = await testPage.$('iframe[title="Sunai demo video"]');
  console.log('  -> Iframe handle while away on slide 15:', iframeWhileAway);
  if (iframeWhileAway !== null) {
    throw new Error('Assertion failed: iframe is still mounted in DOM while slide 14 is inactive!');
  }
  console.log('  -> PASS: Iframe is completely removed from DOM when navigating away.');

  // Step C: Navigate back to slide 14 using prev button
  console.log('Step C: Navigating back to slide 14 using previous button...');
  const prevBtn = await testPage.$('button[aria-label="Previous slide"]');
  if (prevBtn) {
    await prevBtn.click();
  } else {
    await testPage.evaluate(() => window.location.hash = '#demo');
  }
  await sleep(1500);

  // Check placeholder is back and iframe is not there
  const placeholderBack = await testPage.$('button[aria-label="Play demonstration video"]');
  const iframeAfterReturn = await testPage.$('iframe[title="Sunai demo video"]');
  console.log('  -> Play button present on return:', !!placeholderBack);
  console.log('  -> Iframe present on return:', !!iframeAfterReturn);

  if (!placeholderBack) throw new Error('Assertion failed: placeholder button not restored on return');
  if (iframeAfterReturn !== null) throw new Error('Assertion failed: iframe is present on return instead of placeholder');
  console.log('  -> PASS: Placeholder is restored and iframe is not present on return.');

  console.log('\n--- ALL SLIDE 14 TESTS PASSED SUCCESSFULLY! ---');
  await browser.close();
}

run().catch((err) => {
  console.error('\nTest failed with error:', err);
  process.exit(1);
});
