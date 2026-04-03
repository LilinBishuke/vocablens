const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const extensionPath = path.resolve(__dirname, '..');
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

(async () => {
  if (!fs.existsSync(chromePath)) {
    console.error('Chrome not found at', chromePath);
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: false, // Must be false to support extensions
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  });

  const page = await browser.newPage();
  const videoId = 'J7XpscQqCYw';
  
  await new Promise(r => setTimeout(r, 1000));
  const targets = await browser.targets();
  const extensionTarget = targets.find(t => t.type() === 'service_worker' && t.url().startsWith('chrome-extension://'));
  
  if (!extensionTarget) {
    console.error('Could not find extension target');
    await browser.close();
    return;
  }
  
  const extensionId = extensionTarget.url().split('/')[2];
  console.log(`Extension ID: ${extensionId}`);
  
  const videoPageUrl = `chrome-extension://${extensionId}/video/video.html?url=https://www.youtube.com/watch?v=${videoId}`;
  console.log(`Navigating to ${videoPageUrl}`);
  
  await page.goto(videoPageUrl, { waitUntil: 'networkidle2' });
  
  console.log('Clicking "Analyze Subtitles" button...');
  await page.waitForSelector('#analyzeBtn');
  await page.click('#analyzeBtn');
  
  // Wait for the subtitles to load or an error to appear
  try {
    const errorEl = await page.waitForSelector('#subtitleError', { visible: true, timeout: 5000 });
    const errText = await page.evaluate(el => el.textContent, errorEl);
    console.error('API Error displayed:', errText.trim());
  } catch(e) {
    // If no error, check if subtitles appeared
    try {
      await page.waitForSelector('.subtitle-segment', { visible: true, timeout: 10000 });
      console.log('SUCCESS! Subtitles loaded properly.');
    } catch(e2) {
      console.error('Failed to load subtitles or display error within timeout.');
    }
  }

  await browser.close();
})();
