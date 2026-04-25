import { apiClient } from './apiClient';
import { DeliveryRequest, DeliveryResponse } from '../types/contracts';

export async function requestDelivery(
  payload: DeliveryRequest,
): Promise<DeliveryResponse> {
  const response = await apiClient.post<DeliveryResponse>('/delivery/request', payload);
  return response.data;
}
