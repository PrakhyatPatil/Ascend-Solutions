import { NativeModules, Platform } from 'react-native';
import Tts from 'react-native-tts';
import RNFS from 'react-native-fs';
import { apiClient } from './apiClient';

const { NavableVoice } = NativeModules;
let ttsInitialized = false;

async function ensureSystemTts(): Promise<void> {
  if (ttsInitialized) return;
  try {
    await Tts.getInitStatus();
    Tts.setDefaultRate(0.48);
    Tts.setDefaultLanguage('hi-IN');
    ttsInitialized = true;
  } catch {
    ttsInitialized = true;
  }
}

async function speakWithSystemTts(text: string): Promise<void> {
  await ensureSystemTts();
  try {
    await Tts.stop();
    Tts.speak(text);
  } catch (e) {
    console.warn('System TTS speak failed', e);
  }
}

// Try Sarvam TTS - writes WAV to temp file and plays it via Native Module
async function speakWithSarvam(text: string, language = 'hi'): Promise<boolean> {
  try {
    const response = await apiClient.post<{ ok: boolean; audio_base64: string | null }>(
      '/voice/tts',
      { text, language },
      { timeout: 8000 },
    );
    const b64 = response.data?.audio_base64;
    if (!b64) return false;

    const path = `${RNFS.CachesDirectoryPath}/nova_response.wav`;
    await RNFS.writeFile(path, b64, 'base64');
    const fileUri = Platform.OS === 'android' ? `file://${path}` : path;
    console.log('Sarvam audio ready at:', fileUri);
    
    // Only pure Java methods to sidestep the user's NDK bug!
    if (NavableVoice) {
       await NavableVoice.playAudio(fileUri);
       return true; 
    }
    return false;
  } catch (e) {
    console.warn('Sarvam TTS failed:', e);
    return false;
  }
}

export async function speakText(text: string, language = 'hi'): Promise<void> {
  if (!text.trim()) return;
  const sarvamOk = await speakWithSarvam(text, language);
  if (!sarvamOk) {
    await speakWithSystemTts(text);
  }
}

export async function stopSpeaking(): Promise<void> {
  try {
    await Tts.stop();
  } catch {}
}
