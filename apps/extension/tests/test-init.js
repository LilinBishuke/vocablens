(async () => {
  const videoId = 'J7XpscQqCYw';
  const pageResp = await fetch('https://www.youtube.com/watch?v=' + videoId);
  const html = await pageResp.text();
  const match = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/);
  if (!match) return console.log('No init response');
  const data = JSON.parse(match[1]);
  if (data.captions && data.captions.playerCaptionsTracklistRenderer) {
    const track = data.captions.playerCaptionsTracklistRenderer.captionTracks[0];
    const url = track.baseUrl;
    console.log('Fetching URL:', url.substring(0, 150) + '...');
    const capResp = await fetch(url);
    const xml = await capResp.text();
    console.log('Status:', capResp.status);
    console.log('XML length:', xml.length);
    console.log('Preview:', xml.substring(0, 100));
  } else {
    console.log('No captions in init response');
  }
})();
