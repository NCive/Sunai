import puppeteer from 'puppeteer-core';
import path from 'path';

const SCREENSHOTS_DIR = path.resolve('public/screenshots');

async function run() {
  console.log('Launching browser to test online assistant state...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Visit assistant at 5173 to take a screenshot of the running assistant
  console.log('Navigating to assistant at 5173...');
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 5000 });
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'assistant-running-5173.png'),
    });
    console.log('Captured assistant-running-5173.png');
  } catch (e) {
    console.error('Error visiting 5173:', e);
  }

  // 2. Visit Landing page on 5174
  console.log('Navigating to Landing on 5174...');
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });

  // Wait for the status check fetch to resolve
  await new Promise((r) => setTimeout(r, 2000));

  // Capture navbar area with green dot
  const header = await page.$('header');
  if (header) {
    await header.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'online-navbar.png'),
    });
    console.log('Captured online-navbar.png');
  }

  // Test click on Voice Assistant button - should navigate to 5173 without opening modal
  console.log('Clicking Voice Assistant button when online...');
  const [navResponse] = await Promise.all([
    page.waitForNavigation({ timeout: 5000 }),
    page.click('header a[aria-label="Open the Sunai voice assistant"]'),
  ]);

  const targetUrl = page.url();
  console.log(`Navigated to: ${targetUrl}`);
  if (targetUrl.includes('5173')) {
    console.log('SUCCESS: Voice Assistant button successfully navigated to 5173 directly!');
  } else {
    console.error('FAIL: Expected navigation to 5173, but landed on ' + targetUrl);
  }

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

