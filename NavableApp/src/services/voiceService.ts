import { apiClient } from './apiClient';
import { VoiceQueryRequest, VoiceQueryResponse } from '../types/contracts';

export async function queryVoiceAgent(
  payload: VoiceQueryRequest,
): Promise<VoiceQueryResponse> {
  const response = await apiClient.post<VoiceQueryResponse>('/voice/query', payload);
  return response.data;
}
