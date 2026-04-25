import { apiClient } from './apiClient';
import { PinsNearbyResponse } from '../types/contracts';

interface NearbyPinsParams {
  lat: number;
  lng: number;
  radius_m: number;
}

export async function getNearbyPins(
  params: NearbyPinsParams,
): Promise<PinsNearbyResponse> {
  const response = await apiClient.get<PinsNearbyResponse>('/pins/nearby', {
    params,
  });

  return response.data;
}
