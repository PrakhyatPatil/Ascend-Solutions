export type HazardType =
  | 'vehicle'
  | 'step'
  | 'pothole'
  | 'barrier'
  | 'crowd'
  | 'wet_floor'
  | 'unknown';

export type DistanceEstimate = 'near' | 'mid' | 'far';
export type Direction = 'left' | 'center' | 'right';
export type AlertLevel = 'high' | 'medium' | 'low';

export interface HazardEvent {
  timestamp: string;
  hazard: HazardType;
  confidence: number;
  distance_estimate: DistanceEstimate;
  direction: Direction;
  alert_level: AlertLevel;
}

export type PinStatus = 'green' | 'amber' | 'red' | 'grey';

export interface PinRecord {
  id: string;
  name: string;
  lat: number;
  lng: number;
  score: number;
  status: PinStatus;
  entry_access: 'ramp' | 'step' | 'both' | 'neither';
  lift_status: 'working' | 'broken' | 'absent';
  path_quality: 'smooth' | 'uneven' | 'under_construction';
  blockage: 'clear' | 'blocked';
  accessible_toilet: 'yes' | 'no';
  last_updated_at: string;
}

export interface PinsNearbyResponse {
  pins: PinRecord[];
}

export interface VoiceQueryRequest {
  user_id: string;
  lat: number;
  lng: number;
  query_text: string;
  recent_hazards: Pick<
    HazardEvent,
    'hazard' | 'distance_estimate' | 'direction' | 'alert_level'
  >[];
}

export interface VoiceQueryResponse {
  answer_text: string;
  audio_url: string | null;
  language: string;
}

export interface SosTriggerRequest {
  user_id: string;
  lat: number;
  lng: number;
  contacts: string[];
  message: string;
}

export interface SosTriggerResponse {
  ok: boolean;
  sent: number;
  tracking_url: string;
}

export interface ApiError {
  ok: false;
  error_code: string;
  message: string;
}
