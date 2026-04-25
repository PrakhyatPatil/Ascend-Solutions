import { apiClient } from './apiClient';
import axios from 'axios';
import { APP_CONFIG } from '../config/env';
import { VoiceQueryRequest, VoiceQueryResponse } from '../types/contracts';

export async function queryVoiceAgent(
  payload: VoiceQueryRequest,
): Promise<VoiceQueryResponse> {
  const canUseBridge = APP_CONFIG.useAgentBridge && Boolean(APP_CONFIG.agentBridgeBaseUrl);

  if (canUseBridge) {
    try {
      const bridgeResponse = await axios.post<VoiceQueryResponse>(
        `${APP_CONFIG.agentBridgeBaseUrl}/agent/reply`,
        payload,
        {
          timeout: 12000,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      return bridgeResponse.data;
    } catch (error) {
      console.warn('Bridge call failed. Falling back to direct Lambda voice endpoint.', error);
    }
  }

  const response = await apiClient.post<VoiceQueryResponse>('/voice/query', payload);
  return response.data;
}
