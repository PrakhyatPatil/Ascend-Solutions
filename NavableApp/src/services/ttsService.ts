import Tts from 'react-native-tts';

let initialized = false;
let initializationFailed = false;

async function ensureInitialized(): Promise<void> {
  if (initialized) {
    return;
  }

  if (initializationFailed) {
    return;
  }

  try {
    await Tts.getInitStatus();
    Tts.setDefaultRate(0.48);
    initialized = true;
  } catch (error) {
    initializationFailed = true;
    console.warn('TTS initialization failed. Continuing without spoken output.', error);
  }
}

export async function speakText(text: string): Promise<void> {
  if (!text.trim()) {
    return;
  }

  await ensureInitialized();

  if (!initialized) {
    return;
  }

  try {
    await Tts.stop();
    Tts.speak(text);
  } catch (error) {
    console.warn('TTS speak failed. Continuing without spoken output.', error);
  }
}
