import { APP_CONFIG } from '../config/env';
import { SEEDED_PINS } from '../data/seedPins';
import { getNearbyPins } from '../services/pinsService';
import { PinRecord } from '../types/contracts';
import { getCacheItem, setCacheItem } from './cache';

const PINS_CACHE_KEY = 'pins_nearby_cache_v1';

interface CachedPinsPayload {
  pins: PinRecord[];
  updatedAt: string;
  source: 'api' | 'seed';
}

export async function loadPinsWithOfflineFallback(options: {
  isOnline: boolean;
  lat?: number;
  lng?: number;
  radius?: number;
}): Promise<CachedPinsPayload> {
  const lat = options.lat ?? APP_CONFIG.defaultCenter.lat;
  const lng = options.lng ?? APP_CONFIG.defaultCenter.lng;
  const radius = options.radius ?? APP_CONFIG.defaultRadiusMeters;

  if (options.isOnline) {
    try {
      const response = await getNearbyPins({ lat, lng, radius_m: radius });
      const payload: CachedPinsPayload = {
        pins: response.pins,
        updatedAt: new Date().toISOString(),
        source: 'api',
      };
      await setCacheItem(PINS_CACHE_KEY, payload);
      return payload;
    } catch {
      // Continue with cache fallback when API is unavailable.
    }
  }

  const cached = await getCacheItem<CachedPinsPayload>(PINS_CACHE_KEY);
  if (cached) {
    return cached;
  }

  const seeded: CachedPinsPayload = {
    pins: SEEDED_PINS,
    updatedAt: new Date().toISOString(),
    source: 'seed',
  };
  await setCacheItem(PINS_CACHE_KEY, seeded);
  return seeded;
}
