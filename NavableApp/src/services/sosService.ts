import { apiClient } from './apiClient';
import { SosTriggerRequest, SosTriggerResponse } from '../types/contracts';

export async function triggerSos(
  payload: SosTriggerRequest,
): Promise<SosTriggerResponse> {
  const response = await apiClient.post<SosTriggerResponse>('/sos/trigger', payload);
  return response.data;
}
