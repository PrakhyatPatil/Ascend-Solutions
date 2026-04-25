Navable Frontend Build Handout for Urvashi (React Native, APK, Offline + Online)

Purpose
Build the base Android-first React Native app for Navable that works offline, connects online when available, and is ready to receive live hazard events from on-device ML at about 20 FPS.

Scope Lock (Do Not Drift)
1. Do not build SMS flows now.
2. Do not build telephony now.
3. Build app shell, map layer, voice UI, hazard alert UI, offline cache, API connectors.
4. Keep architecture ready for native ML event stream integration.

Primary Demo Features
1. Live hazard alerts on screen and audio.
2. Accessibility map with cached pins and online refresh.
3. Big mic button for voice query to backend endpoint.
4. SOS button as local emergency state only (no SMS requirement for current build).

Tech Choices
1. React Native CLI (bare workflow), TypeScript.
2. Android target first.
3. Storage: AsyncStorage for cache.
4. Connectivity: NetInfo.
5. Map: react-native-maps.
6. Audio:
   - TTS for spoken hazard alerts and assistant responses.
   - Optional earcon for medium alerts.
7. API client: Axios.
8. State: lightweight context or Zustand.

Project Structure Required
1. src/screens
   - HomeScreen
   - MapScreen
   - SafetyScreen
2. src/components
   - MicButton
   - OfflineBanner
   - HazardToast
   - PinLegend
3. src/services
   - apiClient
   - pinsService
   - voiceService
   - hazardStreamService
4. src/offline
   - cache
   - syncManager
   - queue
5. src/types
   - contracts for pins, hazards, voice response
6. src/config
   - env and endpoint config

Backend Endpoints to Use
Base URL currently live from backend deployment.
Required routes:
1. GET /health
2. GET /pins/nearby
3. POST /voice/query
4. POST /sos/trigger (keep optional UI call only, no hard dependency)

Offline Requirements (Must Pass)
1. App must open fully without internet.
2. Last known pins must render from cache.
3. Hazard UI must work without internet.
4. Voice API failures must show graceful fallback message, no crash.
5. Offline banner must always reflect connection state.

Data Contracts (Frontend Types)
Hazard event
1. timestamp
2. hazard
3. confidence
4. distance_estimate
5. direction
6. alert_level

Pin record
1. id
2. name
3. lat
4. lng
5. score
6. status
7. entry_access
8. lift_status
9. path_quality
10. blockage
11. accessible_toilet
12. last_updated_at

Voice query request
1. user_id
2. lat
3. lng
4. query_text
5. recent_hazards

Voice query response
1. ok
2. answer_text
3. audio_url (nullable)
4. language

ML Integration Design (Critical)
Goal
Receive hazard events from native Android module at near real-time cadence and convert them into user-facing alerts.

How integration should work
1. Native layer runs camera + TFLite inference.
2. Native module emits hazard events to JS through event emitter.
3. JS hazardStreamService listens, debounces, and applies alert policy.
4. High alerts trigger immediate spoken warning.
5. Medium alerts trigger tone and optional short speech.
6. Low alerts only log/update UI.

Why 20 FPS is realistic
1. Use compact detector model (YOLOv8n family converted to TFLite int8).
2. Input resolution around 320 or 416.
3. Delegate on-device acceleration where available.
4. Keep post-processing lightweight.
5. Avoid heavy JS-side computation.

Expected model sizes
1. YOLOv8n FP16 TFLite typically about 6 to 8 MB.
2. YOLOv8n INT8 TFLite typically about 3 to 5 MB.
3. If custom classes are added, size may increase slightly.

Recommended inference classes for demo
1. person
2. bicycle
3. motorcycle
4. car
5. bus
6. truck
7. pothole (custom class)
8. barrier or cone (custom class)
9. stairs or step (custom class)

Judge Question: How moving objects are detected
Clear answer to present
1. The model performs per-frame object detection from live camera feed.
2. It detects object class and bounding box every frame.
3. Movement is inferred by tracking box position changes across consecutive frames.
4. Relative risk is computed from:
   - box growth rate (object approaching)
   - motion direction relative to user path
   - class priority (person or vehicle higher than static object)
5. Alert policy uses both detection confidence and motion trend, not just static detection.

Simple movement logic for MVP
1. Keep last 5 frame boxes per tracked object.
2. Compute center delta and area delta.
3. If center converges toward path and area is increasing quickly, mark high risk.
4. If object is lateral and receding, medium or low.

Front-end tasks Urvashi should complete first
1. Build 3-tab app shell with accessibility-friendly controls.
2. Add map and pin legend.
3. Add cached pin fetch and online refresh.
4. Add mic button and backend call path.
5. Add hazard mock stream for development.
6. Add native hazard stream interface placeholder.
7. Add alert rendering and TTS output.
8. Add robust loading and error states.

APK Requirement
1. Build Android debug APK early for hardware testing.
2. Build release APK before demo freeze.
3. Keep min SDK compatible with target test device.

Testing checklist before handoff
1. Works on airplane mode with cached map pins.
2. Handles backend downtime gracefully.
3. Hazard stream still updates UI offline.
4. Voice query online path works under normal network.
5. No crashes after 15 minutes continuous use.

Copilot Prompt Urvashi can paste in her VS Code
Create a React Native CLI TypeScript Android app for Navable with three tabs Home, Map, and Safety. Implement offline-first behavior with AsyncStorage and NetInfo, including cached nearby accessibility pins and online refresh. Add services for GET pins nearby, POST voice query, and optional POST sos trigger. Create a hazard stream service that currently supports mocked events and is designed to later receive native Android TFLite detector events through an event emitter. Implement hazard alert policy for high medium low severity, show on-screen alerts, and speak high-severity alerts via TTS. Add clean modular architecture with types, services, offline modules, and robust loading and error states.

Integration Contract with ML teammate
1. ML module must emit normalized hazard events in agreed schema.
2. Frontend only consumes events and applies policy.
3. Any model-specific logic stays in native module, not in UI components.

Final Constraint
Ship a reliable, smooth baseline app first. Fancy visuals only after reliability is confirmed.
