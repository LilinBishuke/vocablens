/**
 * 英単語の読み上げ（iOS Safari/Chrome 対応版）。
 * - 直前の発話をキャンセルしてから話す
 * - iOS で一時停止状態のまま固まる問題に resume() で対処
 */
export function speakWord(text: string) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.95;
    // 英語ボイスがあれば明示指定（iOSでlang指定だけだと日本語ボイスになることがある）
    const voice = synth
      .getVoices()
      .find((v) => v.lang?.startsWith("en") && v.localService) ??
      synth.getVoices().find((v) => v.lang?.startsWith("en"));
    if (voice) u.voice = voice;
    synth.resume();
    synth.speak(u);
  } catch {
    // 非対応環境では無音
  }
}
