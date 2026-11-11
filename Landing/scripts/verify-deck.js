import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = path.resolve('public/screenshots/deck');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const SLIDE_IDS = [
  'hero',
  'problem',
  'pause-first',
  'outcomes',
  'simulation',
  'features',
  'languages',
  'architecture',
  'pipeline',
  'hardware',
  'why-qwen',
  'status',
  'tech-stack',
  'demo',
  'team',
  'closing',
];

async function run() {
  console.log('Launching Chrome for Deck Verification...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Test 1: Desktop 1440x900
  console.log('\n--- 1. Testing Desktop 1440x900 ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));

  // Capture Slide 01
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'desktop-slide-01-hero.png'),
  });
  console.log('Captured desktop-slide-01-hero');

  // Test Keyboard Navigation through each slide
  for (let i = 1; i < SLIDE_IDS.length; i++) {
    // Press ArrowRight to advance
    await page.keyboard.press('ArrowRight');
    // Slide 3 has build steps, so ArrowRight may advance build steps
    if (i === 2) {
      // 4 build steps on pause-first
      await new Promise((r) => setTimeout(r, 600));
      await page.keyboard.press('ArrowRight');
      await new Promise((r) => setTimeout(r, 600));
      await page.keyboard.press('ArrowRight');
      await new Promise((r) => setTimeout(r, 600));
      await page.keyboard.press('ArrowRight');
    }
    await new Promise((r) => setTimeout(r, 900));

    const slideNum = String(i + 1).padStart(2, '0');
    const filename = `desktop-slide-${slideNum}-${SLIDE_IDS[i]}.png`;
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, filename),
    });
    console.log(`Captured ${filename}`);
  }

  // Test 2: Mid-Transition Frames (Iris, Flip, Split-Horizontal)
  console.log('\n--- 2. Capturing Mid-Transition Frames ---');
  
  // Transition 1 to 2: push-up (around 50% transition)
  await page.evaluate(() => {
    // Find spacer height
    const vh = window.innerHeight;
    // Slide 1 offset: 0, hold 60vh (540px), trans 40vh (360px)
    // 50% transition is at 540 + 180 = 720px
    window.scrollTo({ top: 720, behavior: 'instant' });
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'transition-pushup-mid.png'),
  });
  console.log('Captured transition-pushup-mid');

  // Transition 2 to 3: iris
  await page.evaluate(() => {
    // Slide 2 starts at 100vh, hold 60vh, transition 40vh
    // 100vh = 900, + 60vh = 1440, + 20vh = 1620
    window.scrollTo({ top: 1620, behavior: 'instant' });
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'transition-iris-mid.png'),
  });
  console.log('Captured transition-iris-mid');

  // Transition 4 to 5: 3D flip
  // Slide 3 ends around (900 + 900 + 200vh = 3600).
  // Slide 4 starts at 3600, hold 60vh (540), trans 40vh (360) -> 3600 + 540 + 180 = 4320
  await page.evaluate(() => {
    window.scrollTo({ top: 4320, behavior: 'instant' });
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'transition-flip-mid.png'),
  });
  console.log('Captured transition-flip-mid');

  // Test 3: Overview Sorter Modal (Key 'o')
  console.log('\n--- 3. Testing Overview Modal ---');
  await page.keyboard.press('o');
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'overview-modal.png'),
  });
  console.log('Captured overview-modal');

  // Close overview with Escape
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 400));

  // Test 4: Offline Popover
  console.log('\n--- 4. Testing Offline Popover ---');
  // Click the top navbar "Voice Assistant" button
  const voiceBtn = await page.$('a[aria-label="Open the Sunai voice assistant"]');
  if (voiceBtn) {
    await voiceBtn.click();
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'offline-popover.png'),
    });
    console.log('Captured offline-popover');

    // Close modal
    const closeBtn = await page.$('button[aria-label="Close dialog"]');
    if (closeBtn) await closeBtn.click();
    await new Promise((r) => setTimeout(r, 300));
  }

  // Test 5: Reduced Motion Stacked Mode
  console.log('\n--- 5. Testing Reduced Motion Mode ---');
  // Find reduced motion button on bottom right HUD
  const motionBtn = await page.$('button[aria-label*="motion" i]');
  if (motionBtn) {
    await motionBtn.click();
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'reduced-motion-stacked.png'),
    });
    console.log('Captured reduced-motion-stacked');
  }

  // Test 6: Mobile 390x844 (iPhone 14 / modern standard)
  console.log('\n--- 6. Testing Mobile 390x844 ---');
  const mobilePage = await browser.newPage();
  await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await mobilePage.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));

  // Capture all 16 slides on mobile by deep-linking to each
  for (let i = 0; i < SLIDE_IDS.length; i++) {
    const id = SLIDE_IDS[i];
    await mobilePage.goto(`http://localhost:5174/#${id}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));

    const slideNum = String(i + 1).padStart(2, '0');
    const filename = `mobile-slide-${slideNum}-${id}.png`;
    await mobilePage.screenshot({
      path: path.join(SCREENSHOTS_DIR, filename),
    });
    console.log(`Captured mobile ${filename}`);
  }

  // Measure FPS during continuous scroll
  console.log('\n--- 7. Measuring Scroll FPS & Smoothness ---');
  const perfMetrics = await mobilePage.evaluate(async () => {
    let frames = 0;
    const start = performance.now();
    let lastTime = start;
    const frameTimes = [];

    return new Promise((resolve) => {
      function loop(now) {
        frames++;
        frameTimes.push(now - lastTime);
        lastTime = now;

        // Smoothly scroll down
        window.scrollBy(0, 15);

        if (now - start < 2000) {
          requestAnimationFrame(loop);
        } else {
          const elapsed = (now - start) / 1000;
          const fps = Math.round(frames / elapsed);
          resolve({ fps, frames, elapsed });
        }
      }
      requestAnimationFrame(loop);
    });
  });

  console.log(`Measured Mobile Scroll Performance: ${perfMetrics.fps} FPS over ${perfMetrics.frames} frames`);

  await browser.close();
  console.log('\n=== All Deck Verifications & Screenshots Completed Successfully ===\n');
}

run().catch((err) => {
  console.error('Error during deck verification:', err);
  process.exit(1);
});

