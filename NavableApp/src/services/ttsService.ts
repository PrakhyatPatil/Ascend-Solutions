import Tts from 'react-native-tts';

let initialized = false;

function ensureInitialized() {
  if (initialized) {
    return;
  }
  Tts.setDefaultRate(0.48);
  initialized = true;
}

export async function speakText(text: string): Promise<void> {
  if (!text.trim()) {
    return;
  }

  ensureInitialized();
  await Tts.stop();
  Tts.speak(text);
}
