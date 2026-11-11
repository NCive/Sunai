import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

async function tracePerf() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-gpu-benchmarking'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));

  const tracePath = path.resolve('trace-after.json');
  await page.tracing.start({ path: tracePath, categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'v8.execute'] });

  await page.evaluate(async () => {
    const start = performance.now();
    return new Promise((resolve) => {
      function tick(now) {
        window.scrollBy(0, 15);
        if (now - start < 2000) {
          requestAnimationFrame(tick);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(tick);
    });
  });

  await page.tracing.stop();
  await browser.close();

  // Parse trace events
  const traceData = JSON.parse(fs.readFileSync(tracePath, 'utf8'));
  const events = traceData.traceEvents || [];

  let gpuRasterDurationUs = 0;
  let layoutDurationUs = 0;
  let paintDurationUs = 0;
  let scriptDurationUs = 0;
  let droppedFrames = 0;

  for (const ev of events) {
    if (ev.name === 'RasterTask' && ev.dur) gpuRasterDurationUs += ev.dur;
    if (ev.name === 'Layout' && ev.dur) layoutDurationUs += ev.dur;
    if (ev.name === 'Paint' && ev.dur) paintDurationUs += ev.dur;
    if (ev.name === 'FunctionCall' && ev.dur) scriptDurationUs += ev.dur;
    if (ev.name === 'DroppedFrame') droppedFrames++;
  }

  const summary = {
    gpuRasterMs: Math.round(gpuRasterDurationUs / 1000),
    layoutMs: Math.round(layoutDurationUs / 1000),
    paintMs: Math.round(paintDurationUs / 1000),
    scriptMs: Math.round(scriptDurationUs / 1000),
    droppedFrames,
  };

  console.log('Trace Summary:');
  console.log(JSON.stringify(summary, null, 2));

  // Clean up trace file
  if (fs.existsSync(tracePath)) fs.unlinkSync(tracePath);
}

tracePerf().catch(err => {
  console.error(err);
  process.exit(1);
});

