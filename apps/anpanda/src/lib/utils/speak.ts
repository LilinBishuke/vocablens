/**
 * 英単語の読み上げ（iOS対応版）。
 * - マナーモード対策: 無音バッファ再生で audio session を「メディア再生」に切替
 *   （これをしないと iOS のサイレントスイッチONで TTS が無音になる）
 * - cancel 直後の speak が落ちる iOS の競合を 1tick 遅延で回避
 * - 英語ボイスを明示（lang 指定だけだと日本語ボイスになる端末がある）
 */

let audioCtx: AudioContext | null = null;

function unlockAudioSession() {
  try {
    type W = typeof window & { webkitAudioContext?: typeof AudioContext };
    const AC = window.AudioContext ?? (window as W).webkitAudioContext;
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    const buf = audioCtx.createBuffer(1, 1, 22050);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx.destination);
    src.start(0);
  } catch {
    // 失敗しても読み上げ自体は試みる
  }
}

export function speakWord(text: string) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    unlockAudioSession();
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.95;
    u.volume = 1;
    const voices = synth.getVoices();
    const voice =
      voices.find((v) => v.lang?.startsWith("en") && v.localService) ??
      voices.find((v) => v.lang?.startsWith("en"));
    if (voice) u.voice = voice;
    setTimeout(() => {
      synth.resume();
      synth.speak(u);
    }, 60);
  } catch {
    // 非対応環境では無音
  }
}
