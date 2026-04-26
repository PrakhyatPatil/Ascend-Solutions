import {
  API_BASE_URL,
  API_VERSION,
  NAVABLE_API_KEY,
  LIVEKIT_WS_URL,
  LIVEKIT_TOKEN_URL,
  AGENT_BRIDGE_BASE_URL,
  USE_AGENT_BRIDGE,
  ENABLE_LIVE_MAP,
  ENABLE_MOCK_HAZARDS,
  ENABLE_REMOTE_SOS,
  DEFAULT_USER_ID,
  DEFAULT_CENTER_LAT,
  DEFAULT_CENTER_LNG,
  DEFAULT_RADIUS_METERS
} from '@env';

export const APP_CONFIG = {
  apiBaseUrl: API_BASE_URL || 'https://6ksep4avie2xopo6wnadojzpni0bwgpo.lambda-url.us-east-1.on.aws',
  apiVersion: API_VERSION || '1',
  navableApiKey: NAVABLE_API_KEY || 'navable_ZjJnfhGuMiFKSMefFOTyEC4lW9n6lnj8',
  livekitWsUrl: LIVEKIT_WS_URL || '',
  livekitTokenUrl: LIVEKIT_TOKEN_URL || '',
  agentBridgeBaseUrl: (AGENT_BRIDGE_BASE_URL || '').replace(/\/$/, ''),
  useAgentBridge: USE_AGENT_BRIDGE === 'true',
  enableLiveMap: ENABLE_LIVE_MAP === 'true',
  enableMockHazards: ENABLE_MOCK_HAZARDS === 'true',
  enableRemoteSos: ENABLE_REMOTE_SOS === 'true',
  defaultUserId: DEFAULT_USER_ID || 'u_123',
  defaultCenter: {
    lat: DEFAULT_CENTER_LAT ? parseFloat(DEFAULT_CENTER_LAT) : 22.7196,
    lng: DEFAULT_CENTER_LNG ? parseFloat(DEFAULT_CENTER_LNG) : 75.8577,
  },
  defaultRadiusMeters: DEFAULT_RADIUS_METERS ? parseInt(DEFAULT_RADIUS_METERS, 10) : 2500,
};
