# Urvashi Guide: React Native App (Offline-First + Beginner-Friendly)

## 1. Your Objective
Build the mobile app shell and integrations so judges can see:
- Live hazard alerts
- Map pins with accessibility info
- Big mic voice assistant
- SOS button

You do NOT need to solve ML training or AWS internals.

## 2. Recommended Tech Choices
- React Native CLI (bare workflow), not pure Expo managed.
Reason:
- Easier native module integration for camera/TFLite stream from Prakhyat.
- Better control for Android-first hackathon demos.

Core libraries:
- react-native-maps
- @react-native-async-storage/async-storage
- @react-native-community/netinfo
- react-native-tts (or platform TTS fallback)
- react-native-sound (if needed for earcons)
- axios

## 3. App Architecture (Simple)
Screens:
1. Home (big mic, current status)
2. Map (pins + legend + pin sheet)
3. Safety (SOS + trusted contacts)

Shared modules:
- api/client.ts
- offline/cache.ts
- offline/queue.ts
- services/hazardStream.ts
- services/voice.ts
- services/sos.ts

## 4. Offline-First Rules (must implement)
1. Cache last successful pins response in local storage.
2. On app start:
   - If online: fetch fresh pins, update cache.
   - If offline: use cached pins.
3. Never block app open because network fails.
4. Show clear offline banner.
5. Queue optional outgoing actions and retry on reconnect.

## 5. Exact Build Order
1. Build UI shell with 3 tabs and large accessible controls.
2. Add map with local seeded pins JSON first.
3. Add API fetch and local cache fallback.
4. Add hazard event listener (use mocked events first).
5. Convert hazard events to spoken alerts.
6. Add mic button UI and connect to /voice/query.
7. Add SOS button to /sos/trigger.
8. Add loading/error states and offline banner.

## 6. Acceptance Checklist
- App opens offline and still shows map with cached pins.
- Hazard mock stream triggers audible alerts.
- Voice query response text and audio can play.
- SOS action shows success/failure state.
- Buttons have clear labels and are usable with screen reader.

## 7. Copilot Prompt You Can Paste
Use this in your VS Code Copilot chat:

"Build a React Native Android-first app with 3 tabs (Home, Map, Safety). Add offline-first cache for map pins using AsyncStorage, network detection using NetInfo, and graceful fallback UI when offline. Implement services for GET /pins/nearby, POST /voice/query, and POST /sos/trigger. Create a mocked hazard stream service that emits events every few seconds and converts high/medium alert levels into spoken or earcon alerts. Keep code modular in services and offline folders, with TypeScript types for all API payloads."

## 8. What to Ask Backend/ML Early
- Backend: base URL, final request/response payloads from INTEGRATION_CONTRACTS.md.
- ML: hazard event stream method and exact JSON fields.
