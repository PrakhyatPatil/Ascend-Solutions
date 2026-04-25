import { setCacheItem, getCacheItem } from './cache';

const OFFLINE_QUEUE_KEY = 'offline_queue_v1';

export interface QueuedAction<T = unknown> {
  id: string;
  type: string;
  payload: T;
  createdAt: string;
}

export async function enqueueAction<T>(action: QueuedAction<T>): Promise<void> {
  const queue = (await getCacheItem<QueuedAction[]>(OFFLINE_QUEUE_KEY)) ?? [];
  queue.push(action);
  await setCacheItem(OFFLINE_QUEUE_KEY, queue);
}

export async function getQueuedActions(): Promise<QueuedAction[]> {
  return (await getCacheItem<QueuedAction[]>(OFFLINE_QUEUE_KEY)) ?? [];
}

export async function clearQueue(): Promise<void> {
  await setCacheItem(OFFLINE_QUEUE_KEY, []);
}
