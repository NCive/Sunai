import puppeteer from 'puppeteer-core';

async function auditNetwork() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const requests = [];

  page.on('request', (req) => {
    requests.push({
      url: req.url(),
      method: req.method(),
      resourceType: req.resourceType(),
    });
  });

  await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 2000)); // wait for status check

  console.log(`Total requests logged: ${requests.length}`);
  
  const externalRequests = requests.filter(r => {
    const url = new URL(r.url);
    // Allow local host ports 5174 and 5173
    const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    return !isLocalhost;
  });

  console.log('External / Remote Requests:', externalRequests);
  if (externalRequests.length === 0) {
    console.log('AUDIT PASSED: ZERO remote or external network requests. Completely offline self-hosted!');
  } else {
    console.error('AUDIT FAILED: Found external requests:', externalRequests);
  }

  await browser.close();
}

auditNetwork().catch((err) => {
  console.error(err);
  process.exit(1);
});

