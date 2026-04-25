import { HazardEvent } from '../types/contracts';

type Listener = (event: HazardEvent) => void;

const listeners = new Set<Listener>();
let intervalId: ReturnType<typeof setInterval> | null = null;

const demoEvents: Omit<HazardEvent, 'timestamp'>[] = [
  {
    hazard: 'vehicle',
    confidence: 0.87,
    distance_estimate: 'near',
    direction: 'left',
    alert_level: 'high',
  },
  {
    hazard: 'step',
    confidence: 0.61,
    distance_estimate: 'mid',
    direction: 'center',
    alert_level: 'medium',
  },
  {
    hazard: 'crowd',
    confidence: 0.45,
    distance_estimate: 'far',
    direction: 'right',
    alert_level: 'low',
  },
];

function emit(event: Omit<HazardEvent, 'timestamp'>) {
  const payload: HazardEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  listeners.forEach(listener => listener(payload));
}

export function pushNativeHazardEvent(event: Omit<HazardEvent, 'timestamp'>): void {
  emit(event);
}

export function subscribeToHazards(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function startMockHazardStream(intervalMs = 4500): void {
  if (intervalId) {
    return;
  }

  let idx = 0;
  intervalId = setInterval(() => {
    emit(demoEvents[idx % demoEvents.length]);
    idx += 1;
  }, intervalMs);
}

export function stopMockHazardStream(): void {
  if (!intervalId) {
    return;
  }

  clearInterval(intervalId);
  intervalId = null;
}

export function buildHazardMessage(event: HazardEvent): string {
  return `${event.hazard} ${event.distance_estimate} ${event.direction}`;
}
