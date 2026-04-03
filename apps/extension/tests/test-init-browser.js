const puppeteer = require('puppeteer-core');
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
(async () => {
  const browser = await puppeteer.launch({ executablePath: chromePath, headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.youtube.com/watch?v=J7XpscQqCYw', { waitUntil: 'domcontentloaded' });
  
  const result = await page.evaluate(async () => {
    try {
      const match = document.body.innerHTML.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/);
      if (!match) return { error: 'no init response' };
      const data = JSON.parse(match[1]);
      const track = data.captions.playerCaptionsTracklistRenderer.captionTracks[0];
      
      let url = track.baseUrl;
      url += '&c=WEB&cver=2.20240404.00.00';
      
      const capResp = await fetch(url);
      const xml = await capResp.text();
      
      return {
        url: url,
        status: capResp.status,
        xmlLength: xml.length,
        preview: xml.substring(0, 100)
      };
    } catch (e) {
       return { error: e.message };
    }
  });
  
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
