import { apiClient } from './apiClient';
import { DetectHazardsRequest, DetectHazardsResponse } from '../types/contracts';

export async function detectHazards(
  payload: DetectHazardsRequest,
): Promise<DetectHazardsResponse> {
  const response = await apiClient.post<DetectHazardsResponse>('/vision/detect', payload);
  return response.data;
}
