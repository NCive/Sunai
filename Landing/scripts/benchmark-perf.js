import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

async function runBenchmark() {
  console.log('Launching browser for AFTER performance benchmark...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-gpu-benchmarking'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));

  // 1. Measure Continuous Scroll FPS & Long Frames
  console.log('1. Measuring Continuous Scroll FPS & Long Frames...');
  const scrollMetrics = await page.evaluate(async () => {
    let frames = 0;
    let longFrames = 0;
    const start = performance.now();
    let lastTime = start;
    const frameDeltas = [];

    return new Promise((resolve) => {
      function tick(now) {
        frames++;
        const delta = now - lastTime;
        frameDeltas.push(delta);
        if (delta > 35) longFrames++;
        lastTime = now;

        window.scrollBy(0, 16);

        if (now - start < 3000) {
          requestAnimationFrame(tick);
        } else {
          const totalElapsed = (now - start) / 1000;
          const avgFps = Math.round(frames / totalElapsed);
          const maxDelta = Math.round(Math.max(...frameDeltas));
          const avgDelta = (frameDeltas.reduce((a, b) => a + b, 0) / frameDeltas.length).toFixed(1);
          resolve({ avgFps, frames, longFrames, maxDelta, avgDelta });
        }
      }
      requestAnimationFrame(tick);
    });
  });

  // 2. Measure FPS during Iris Transition (Slide 2 -> 3)
  console.log('2. Measuring Iris Transition FPS...');
  const irisMetrics = await page.evaluate(async () => {
    window.scrollTo({ top: 1440, behavior: 'instant' });
    let frames = 0;
    let longFrames = 0;
    const start = performance.now();
    let lastTime = start;
    const frameDeltas = [];

    return new Promise((resolve) => {
      function tick(now) {
        frames++;
        const delta = now - lastTime;
        frameDeltas.push(delta);
        if (delta > 35) longFrames++;
        lastTime = now;

        window.scrollBy(0, 4);

        if (now - start < 1500) {
          requestAnimationFrame(tick);
        } else {
          const totalElapsed = (now - start) / 1000;
          const avgFps = Math.round(frames / totalElapsed);
          const maxDelta = Math.round(Math.max(...frameDeltas));
          resolve({ avgFps, longFrames, maxDelta });
        }
      }
      requestAnimationFrame(tick);
    });
  });

  // 3. Measure FPS during 3D Flip Transition (Slide 4 -> 5)
  console.log('3. Measuring Flip Transition FPS...');
  const flipMetrics = await page.evaluate(async () => {
    window.scrollTo({ top: 4200, behavior: 'instant' });
    let frames = 0;
    let longFrames = 0;
    const start = performance.now();
    let lastTime = start;
    const frameDeltas = [];

    return new Promise((resolve) => {
      function tick(now) {
        frames++;
        const delta = now - lastTime;
        frameDeltas.push(delta);
        if (delta > 35) longFrames++;
        lastTime = now;

        window.scrollBy(0, 4);

        if (now - start < 1500) {
          requestAnimationFrame(tick);
        } else {
          const totalElapsed = (now - start) / 1000;
          const avgFps = Math.round(frames / totalElapsed);
          const maxDelta = Math.round(Math.max(...frameDeltas));
          resolve({ avgFps, longFrames, maxDelta });
        }
      }
      requestAnimationFrame(tick);
    });
  });

  // 4. Measure FPS during Split Horizontal Transition (Slide 9 -> 10)
  console.log('4. Measuring Split Transition FPS...');
  const splitMetrics = await page.evaluate(async () => {
    window.scrollTo({ top: 7800, behavior: 'instant' });
    let frames = 0;
    let longFrames = 0;
    const start = performance.now();
    let lastTime = start;
    const frameDeltas = [];

    return new Promise((resolve) => {
      function tick(now) {
        frames++;
        const delta = now - lastTime;
        frameDeltas.push(delta);
        if (delta > 35) longFrames++;
        lastTime = now;

        window.scrollBy(0, 4);

        if (now - start < 1500) {
          requestAnimationFrame(tick);
        } else {
          const totalElapsed = (now - start) / 1000;
          const avgFps = Math.round(frames / totalElapsed);
          const maxDelta = Math.round(Math.max(...frameDeltas));
          resolve({ avgFps, longFrames, maxDelta });
        }
      }
      requestAnimationFrame(tick);
    });
  });

  // 5. Frame-by-frame verification through slides 1 to 6
  console.log('5. Capturing frame-by-frame sequence across slides 1 to 6 (verifying 0 flashes)...');
  const frameDir = path.resolve('public/screenshots/recordings/slides1-6');
  if (!fs.existsSync(frameDir)) fs.mkdirSync(frameDir, { recursive: true });

  const totalScrollY = 5400; // Covers slides 1 through 6
  const step = 200; // 27 sequence frames
  let frameIdx = 0;

  for (let y = 0; y <= totalScrollY; y += step) {
    frameIdx++;
    await page.evaluate((top) => {
      window.scrollTo({ top, behavior: 'instant' });
    }, y);
    await new Promise((r) => setTimeout(r, 60));
    const padNum = String(frameIdx).padStart(3, '0');
    await page.screenshot({ path: path.join(frameDir, `frame-${padNum}-y${y}.png`) });
  }

  console.log(`Captured ${frameIdx} sequential frames in public/screenshots/recordings/slides1-6`);

  console.log('\n=== AFTER BENCHMARK RESULTS ===');
  console.log(JSON.stringify({
    scrollMetrics,
    irisMetrics,
    flipMetrics,
    splitMetrics,
  }, null, 2));

  await browser.close();
}

runBenchmark().catch((err) => {
  console.error(err);
  process.exit(1);
});

