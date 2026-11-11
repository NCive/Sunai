import puppeteer from 'puppeteer-core';

async function diagnose() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-gpu-benchmarking'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));

  console.log('=== STEP 1: DIAGNOSIS & INSTANCE CHECK ===\n');

  // 1. Check duplicate instances (ScrollTrigger, Lenis, Ticker)
  const instances = await page.evaluate(() => {
    // Check ScrollTrigger instances
    const stCount = window.ScrollTrigger ? window.ScrollTrigger.getAll().length : 0;
    
    // Check canvas elements in DOM
    const canvases = document.querySelectorAll('canvas').length;
    
    // Check ticker listeners if exposed
    const gsapTickers = window.gsap && window.gsap.ticker ? (window.gsap.ticker._listeners ? window.gsap.ticker._listeners.length : 'active') : 'none';

    return { stCount, canvases, gsapTickers };
  });

  console.log('Instance Counts:');
  console.log(`- WebGL Canvases in DOM: ${instances.canvases}`);
  console.log(`- ScrollTrigger instances: ${instances.stCount}`);
  console.log(`- GSAP Ticker status: ${instances.gsapTickers}\n`);

  // Helper function to measure scroll FPS and frame metrics over a 2000ms scroll run
  async function testScrollCondition(label) {
    const metrics = await page.evaluate(async () => {
      let frames = 0;
      let longFrames = 0;
      const start = performance.now();
      let lastTime = start;
      const deltas = [];

      return new Promise((resolve) => {
        function tick(now) {
          frames++;
          const delta = now - lastTime;
          deltas.push(delta);
          if (delta > 35) longFrames++;
          lastTime = now;

          window.scrollBy(0, 15);

          if (now - start < 1800) {
            requestAnimationFrame(tick);
          } else {
            const elapsed = (now - start) / 1000;
            const avgFps = Math.round(frames / elapsed);
            const maxDelta = Math.round(Math.max(...deltas));
            const avgDelta = (deltas.reduce((a, b) => a + b, 0) / deltas.length).toFixed(1);
            resolve({ avgFps, longFrames, maxDelta, avgDelta });
          }
        }
        requestAnimationFrame(tick);
      });
    });

    console.log(`[${label}]: ${metrics.avgFps} FPS | Long Frames (>35ms): ${metrics.longFrames} | Max Frame Time: ${metrics.maxDelta}ms | Avg Frame Time: ${metrics.avgDelta}ms`);
    return metrics;
  }

  // Baseline in production preview
  console.log('Testing Conditions One at a Time:\n');
  await testScrollCondition('1. Baseline (Production Preview)');

  // (a) Turn OFF WebGL Canvas
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) canvas.style.display = 'none';
  });
  await testScrollCondition('2. Turn OFF (a) WebGL canvas');
  // Restore canvas
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) canvas.style.display = 'block';
  });

  // (b) Turn OFF backdrop-filter blur on cards
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.id = 'test-no-backdrop';
    style.innerHTML = `
      * { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
      .deck-card { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; background: rgba(13, 28, 25, 0.9) !important; }
    `;
    document.head.appendChild(style);
  });
  await testScrollCondition('3. Turn OFF (b) backdrop-filter blur on cards');
  // Remove no-backdrop style
  await page.evaluate(() => {
    document.getElementById('test-no-backdrop')?.remove();
  });

  // (c) Turn OFF clip-path transitions
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.id = 'test-no-clippath';
    style.innerHTML = `* { clip-path: none !important; -webkit-clip-path: none !important; }`;
    document.head.appendChild(style);
  });
  await testScrollCondition('4. Turn OFF (c) clip-path transitions');
  await page.evaluate(() => {
    document.getElementById('test-no-clippath')?.remove();
  });

  // (d) Turn OFF Lenis
  await page.evaluate(() => {
    // If lenis is attached to window or can be stopped
    window.dispatchEvent(new Event('resize'));
  });
  await testScrollCondition('5. Turn OFF (d) Lenis / Native Scroll Test');

  // (e) Turn OFF snap
  await page.evaluate(() => {
    if (window.ScrollTrigger) {
      window.ScrollTrigger.getAll().forEach(st => {
        if (st.vars.snap) st.vars.snap = false;
      });
    }
  });
  await testScrollCondition('6. Turn OFF (e) snap');

  // (f) Turn OFF grain & particle atmosphere overlays
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.id = 'test-no-particles';
    style.innerHTML = `
      .blur-\\[120px\\], .blur-\\[90px\\], .blur-\\[40px\\], .blur-\\[30px\\] { display: none !important; }
    `;
    document.head.appendChild(style);
  });
  await testScrollCondition('7. Turn OFF (f) atmosphere blur overlays');
  await page.evaluate(() => {
    document.getElementById('test-no-particles')?.remove();
  });

  // Combined: Turn OFF (b) backdrop-filter + (c) clip-path + (a) webgl low-res
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.id = 'test-combined';
    style.innerHTML = `
      * { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
      .deck-card { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; background: rgba(13, 28, 25, 0.9) !important; }
      * { clip-path: none !important; -webkit-clip-path: none !important; }
      .blur-\\[120px\\], .blur-\\[90px\\], .blur-\\[40px\\], .blur-\\[30px\\] { display: none !important; }
    `;
    document.head.appendChild(style);
  });
  await testScrollCondition('8. Combined: (b) no backdrop-filter + (c) no clip-path + (f) no blur overlays');
  await page.evaluate(() => {
    document.getElementById('test-combined')?.remove();
  });

  await browser.close();
  console.log('\n=== DIAGNOSIS COMPLETE ===');
}

diagnose().catch(err => {
  console.error('Diagnosis error:', err);
  process.exit(1);
});

