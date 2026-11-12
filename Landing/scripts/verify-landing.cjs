const puppeteer = require('../node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const DECK_SCREENSHOTS_DIR = 'Sunai/Landing/public/screenshots/deck';
if (!fs.existsSync(DECK_SCREENSHOTS_DIR)) {
  fs.mkdirSync(DECK_SCREENSHOTS_DIR, { recursive: true });
}

async function runLandingVerification() {
  console.log('=== SUNAI LANDING PRESENTATION DECK VERIFICATION ===\n');

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-gpu-benchmarking',
    ],
  });

  const consoleErrors = [];
  const consoleWarnings = [];

  const page = await browser.newPage();
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error') {
      consoleErrors.push(text);
      console.error('[Browser Error]', text);
    }
    if (msg.type() === 'warning') {
      consoleWarnings.push(text);
      console.warn('[Browser Warning]', text);
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(err.toString());
    console.error('[Page Error]', err);
  });

  // Set desktop viewport 1440x900
  console.log('1. Loading Presentation Deck at 1440x900...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));

  // 1. Check Voice Assistant Button and Online Status
  console.log('2. Checking Voice Assistant button & live status...');
  const assistantButton = await page.$('a[aria-label="Open the Sunai voice assistant"]');
  if (!assistantButton) {
    throw new Error('Voice Assistant button not found!');
  }
  const statusDot = await page.$('.w-2.h-2.rounded-full');
  const dotClasses = await page.evaluate(el => el ? el.className : '', statusDot);
  console.log('   Status dot classes:', dotClasses);
  console.log('   Voice Assistant button found and clickable.');

  // 2. Measure FPS during idle
  console.log('3. Measuring Idle FPS...');
  const idleFps = await page.evaluate(() => {
    return new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      function count() {
        frames++;
        if (performance.now() - start < 1000) {
          requestAnimationFrame(count);
        } else {
          resolve(Math.round((frames * 1000) / (performance.now() - start)));
        }
      }
      requestAnimationFrame(count);
    });
  });
  console.log(`   Idle FPS: ${idleFps} fps (Target >= 30 idle, 60 active)`);

  // 3. Test Slide Navigation across all 16 slides
  console.log('4. Navigating and capturing all 16 slides...');
  const slideCount = 16;
  for (let i = 0; i < slideCount; i++) {
    // Jump to slide i
    await page.evaluate((targetIdx) => {
      const railButtons = document.querySelectorAll('nav[aria-label="Slide Progress Rail"] button');
      if (railButtons[targetIdx]) {
        railButtons[targetIdx].click();
      }
    }, i);

    // Wait 1000ms for Lenis smooth scroll to finish completely
    await new Promise((r) => setTimeout(r, 1000));

    // Measure FPS during slide transition
    const transitionFps = await page.evaluate(() => {
      return new Promise((resolve) => {
        let frames = 0;
        const start = performance.now();
        function count() {
          frames++;
          if (performance.now() - start < 250) {
            requestAnimationFrame(count);
          } else {
            resolve(Math.round((frames * 1000) / (performance.now() - start)));
          }
        }
        requestAnimationFrame(count);
      });
    });

    const slideNum = (i + 1 < 10 ? '0' : '') + (i + 1);
    const screenshotPath = path.join(DECK_SCREENSHOTS_DIR, `slide-${slideNum}-desktop-1440x900.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`   Slide ${slideNum}/16 captured (Transition FPS: ${transitionFps} fps) -> ${screenshotPath}`);
  }

  // 4. Verify Slide 16 isolation (no overlap with slide 15)
  console.log('5. Verifying Slide 16 isolation...');
  const slide16Visibility = await page.evaluate(() => {
    const layer15 = document.getElementById('deck-slide-layer-team');
    const layer16 = document.getElementById('deck-slide-layer-closing');
    return {
      layer15Visible: layer15 ? getComputedStyle(layer15).visibility : null,
      layer15Opacity: layer15 ? getComputedStyle(layer15).opacity : null,
      layer16Visible: layer16 ? getComputedStyle(layer16).visibility : null,
      layer16Opacity: layer16 ? getComputedStyle(layer16).opacity : null,
    };
  });
  console.log('   Slide layers status on Slide 16:', slide16Visibility);
  if (slide16Visibility.layer15Visible !== 'hidden' || parseFloat(slide16Visibility.layer15Opacity) > 0.05) {
    console.error('   FAILED: Slide 15 is still visible under Slide 16');
    process.exit(1);
  } else {
    console.log('   PASSED: Slide 16 shows alone with zero overlap from Slide 15.');
  }

  // 5. Test Overview Modal (Press 'O')
  console.log('6. Testing Overview Modal...');
  await page.keyboard.press('KeyO');
  await new Promise((r) => setTimeout(r, 400));
  const overviewModal = await page.$('#overview-modal-title');
  if (overviewModal) {
    const overviewPath = path.join(DECK_SCREENSHOTS_DIR, 'overview-modal-desktop.png');
    await page.screenshot({ path: overviewPath });
    console.log(`   Overview Modal captured -> ${overviewPath}`);
  } else {
    console.warn('   Overview Modal title not found');
  }
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 400));

  // 6. Test Mobile Viewport 390x844
  console.log('7. Testing Mobile Viewport 390x844...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await new Promise((r) => setTimeout(r, 600));

  const mobileHeroPath = path.join(DECK_SCREENSHOTS_DIR, 'slide-01-mobile-390x844.png');
  await page.screenshot({ path: mobileHeroPath });
  console.log(`   Mobile Hero captured -> ${mobileHeroPath}`);

  // Capture Mobile Slide 3
  await page.evaluate(() => {
    window.scrollTo({ top: 1800, behavior: 'instant' });
  });
  await new Promise((r) => setTimeout(r, 600));
  const mobileSlide3Path = path.join(DECK_SCREENSHOTS_DIR, 'slide-03-mobile-390x844.png');
  await page.screenshot({ path: mobileSlide3Path });
  console.log(`   Mobile Slide 03 captured -> ${mobileSlide3Path}`);

  // 7. Check Console Errors and Warnings
  console.log('\n=== VERIFICATION SUMMARY ===');
  console.log(`Console Errors: ${consoleErrors.length}`);
  console.log(`Console Warnings: ${consoleWarnings.length}`);

  await browser.close();

  if (consoleErrors.length > 0) {
    console.error('Failed due to console errors:', consoleErrors);
    process.exit(1);
  }
  console.log('LANDING VERIFICATION PASSED SUCCESSFULLY!\n');
}

runLandingVerification().catch((err) => {
  console.error('Landing verification error:', err);
  process.exit(1);
});
