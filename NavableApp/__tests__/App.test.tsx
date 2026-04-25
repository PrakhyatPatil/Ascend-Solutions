/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn((handler) => {
    handler({ isConnected: true });
    return () => undefined;
  }),
}));

jest.mock('react-native-tts', () => ({
  setDefaultLanguage: jest.fn(),
  speak: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-maps', () => {
  const ReactNative = require('react-native');
  const View = ReactNative.View;
  const MockMap = ({ children }: { children?: React.ReactNode }) => <View>{children}</View>;
  const MockMarker = ({ children }: { children?: React.ReactNode }) => <View>{children}</View>;
  return {
    __esModule: true,
    default: MockMap,
    Marker: MockMarker,
  };
});

jest.mock('react-native-safe-area-context', () => {
  const ReactNative = require('react-native');
  const View = ReactNative.View;
  return {
    SafeAreaProvider: ({ children }: { children?: React.ReactNode }) => <View>{children}</View>,
  };
});

jest.mock('../src/offline/syncManager', () => ({
  loadPinsWithOfflineFallback: jest.fn(() =>
    Promise.resolve({
      source: 'seed',
      updatedAt: new Date().toISOString(),
      pins: [],
    }),
  ),
}));

jest.mock('../src/services/hazardStreamService', () => ({
  startMockHazardStream: jest.fn(),
  stopMockHazardStream: jest.fn(),
  subscribeToHazards: jest.fn(() => () => undefined),
  buildHazardMessage: jest.fn(() => 'Hazard ahead'),
}));

test('renders correctly', async () => {
  let app: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    app = ReactTestRenderer.create(<App />);
    await Promise.resolve();
  });
  await ReactTestRenderer.act(async () => {
    app!.unmount();
  });
});
