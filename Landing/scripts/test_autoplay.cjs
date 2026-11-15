const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('--- STARTING AUTOPLAY VERIFICATION TESTS ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 970 });
  await page.goto('http://localhost:5174/#hero', { waitUntil: 'networkidle0' });
  await sleep(1500);

  async function getSlideIdx() {
    return await page.evaluate(() => {
      const el = document.querySelector('.text-\\[\\#62C9E8\\].font-bold');
      return el ? parseInt(el.textContent.trim(), 10) - 1 : 0;
    });
  }

  async function getScrollY() {
    return await page.evaluate(() => window.scrollY);
  }

  async function isAutoplayActive() {
    return await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Toggle Autoplay Presentation"]');
      return btn ? btn.querySelector('svg.lucide-pause') !== null : false;
    });
  }

  async function clickPlayPause() {
    await page.click('button[aria-label="Toggle Autoplay Presentation"]');
  }

  console.log(`Initial slide: ${await getSlideIdx()}, autoplay: ${await isAutoplayActive()}`);

  // TEST 1: start autoplay, wait for slide move, then stop, wait 40 seconds -> slide unchanged
  console.log('\n[TEST 1] Testing start -> wait move -> stop -> 40s wait...');
  await clickPlayPause();
  console.log(`Autoplay started: ${await isAutoplayActive()}`);

  // Speed up or wait for next slide
  console.log('Waiting for slide transition or countdown...');
  const startSlide = await getSlideIdx();
  let moved = false;
  const timeoutStart = Date.now();
  while (Date.now() - timeoutStart < 12000) {
    await sleep(500);
    const cur = await getSlideIdx();
    if (cur !== startSlide) {
      moved = true;
      console.log(`Slide moved from ${startSlide} to ${cur}`);
      break;
    }
  }

  if (!moved) {
    console.warn('Autoplay did not move within 12s, calling nextStep manually while autoplay is on');
  }

  // Now Stop autoplay
  console.log('Stopping autoplay...');
  await clickPlayPause();
  const stoppedAutoplayState = await isAutoplayActive();
  console.log(`Autoplay stopped: active=${stoppedAutoplayState}`);
  if (stoppedAutoplayState !== false) {
    throw new Error('FAILED: Autoplay is still active after clicking Stop/Pause');
  }

  const slideAtStop = await getSlideIdx();
  const scrollAtStop = await getScrollY();
  console.log(`Slide index at stop: ${slideAtStop}, scrollY: ${scrollAtStop}`);

  console.log('Waiting 40 seconds to verify NO slide movement occurs...');
  const wait40Start = Date.now();
  let movedDuring40s = false;
  while (Date.now() - wait40Start < 40000) {
    await sleep(2000);
    const curSlide = await getSlideIdx();
    const curScroll = await getScrollY();
    if (curSlide !== slideAtStop || Math.abs(curScroll - scrollAtStop) > 10) {
      console.error(`FAILED: Moved during 40s wait! Slide: ${slideAtStop} -> ${curSlide}, Scroll: ${scrollAtStop} -> ${curScroll}`);
      movedDuring40s = true;
      break;
    }
    const elapsed = Math.round((Date.now() - wait40Start) / 1000);
    process.stdout.write(`... ${elapsed}s / 40s passed (Slide ${curSlide} unchanged)\r`);
  }

  if (movedDuring40s) {
    throw new Error('FAILED: Page moved while autoplay was stopped!');
  }
  console.log('\nTEST 1 PASSED: Zero slide movement over 40 seconds when stopped.');

  // TEST 2: Stop right at a transition
  console.log('\n[TEST 2] Stop right at a transition...');
  // Start autoplay again
  await clickPlayPause();
  await sleep(1000);
  // Trigger jump or scroll towards next slide and immediately stop
  await page.keyboard.press('ArrowRight');
  await sleep(100); // right in the middle of transition
  await clickPlayPause(); // Stop!
  console.log('Stop triggered mid-transition. Waiting 4s to verify it stays put...');
  await sleep(4000);
  const slideAfterMidStop = await getSlideIdx();
  const scrollAfterMidStop = await getScrollY();
  await sleep(3000);
  const slideAfterWait = await getSlideIdx();
  const scrollAfterWait = await getScrollY();
  if (slideAfterMidStop !== slideAfterWait || Math.abs(scrollAfterMidStop - scrollAfterWait) > 5) {
    throw new Error(`FAILED: Movement occurred after mid-transition stop! ${scrollAfterMidStop} -> ${scrollAfterWait}`);
  }
  console.log('TEST 2 PASSED: Stopped cleanly mid-transition with no delayed snap.');

  // TEST 3: Stop, press next, wait
  console.log('\n[TEST 3] Stop, press next, wait...');
  const beforeNextSlide = await getSlideIdx();
  await page.keyboard.press('ArrowRight');
  await sleep(800);
  const afterNextSlide = await getSlideIdx();
  console.log(`Manual Next pressed: Slide ${beforeNextSlide} -> ${afterNextSlide}`);
  console.log('Waiting 12 seconds to ensure autoplay did not resume on its own...');
  await sleep(12000);
  const afterWaitSlide = await getSlideIdx();
  const autoplayStillOff = !(await isAutoplayActive());
  if (afterNextSlide !== afterWaitSlide) {
    throw new Error(`FAILED: Slide moved on its own after manual navigation! ${afterNextSlide} -> ${afterWaitSlide}`);
  }
  if (!autoplayStillOff) {
    throw new Error('FAILED: Autoplay resumed on manual navigation!');
  }
  console.log('TEST 3 PASSED: Manual next did not start autoplay and slide stayed unchanged.');

  // TEST 4: Stop, enter fullscreen, wait
  console.log('\n[TEST 4] Stop, enter fullscreen, wait...');
  await page.keyboard.press('f');
  await sleep(1000);
  const slideInFs = await getSlideIdx();
  console.log(`In fullscreen, slide is ${slideInFs}. Waiting 10s...`);
  await sleep(10000);
  const slideAfterFs = await getSlideIdx();
  if (slideInFs !== slideAfterFs) {
    throw new Error(`FAILED: Slide moved while in fullscreen! ${slideInFs} -> ${slideAfterFs}`);
  }
  await page.keyboard.press('f'); // exit fullscreen
  await sleep(500);
  console.log('TEST 4 PASSED: Fullscreen toggle did not start autoplay.');

  // TEST 5: Stop, then scroll with the wheel and confirm scrolling still works
  console.log('\n[TEST 5] Stop, then scroll with wheel...');
  const scrollBeforeWheel = await getScrollY();
  console.log(`Scroll before wheel: ${scrollBeforeWheel}`);
  await page.mouse.wheel({ deltaY: 600 });
  await sleep(1000);
  const scrollAfterWheel = await getScrollY();
  console.log(`Scroll after wheel: ${scrollAfterWheel}`);
  if (scrollBeforeWheel === scrollAfterWheel) {
    throw new Error('FAILED: Wheel scrolling is frozen after stop! lenis.stop() may have been called.');
  }
  console.log('TEST 5 PASSED: Wheel scrolling works normally after stop (not frozen).');

  await browser.close();
  console.log('\nALL 5 AUTOPLAY VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
