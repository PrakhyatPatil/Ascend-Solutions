# NAVABLE PRD (Hackathon MVP)

## 1. Product Summary
Navable is a voice-first accessibility navigation app for visually and mobility-impaired users in India.

Problem:
- Existing navigation apps do not reliably communicate ground-level accessibility and hazards.
- Users need real-time hazard alerts, accessible route context, and emergency safety support.

MVP Promise:
- Detect hazards in real time.
- Let users ask navigation/accessibility questions by voice.
- Show accessibility quality on map pins.
- Trigger SOS with location to trusted contacts.

## 2. Target Users
- Primary: Visually impaired users.
- Primary: Mobility-impaired users.
- Secondary: Family/trusted contacts who receive SOS/location.

Launch demo location: Indore.

## 3. Hackathon Scope
### In Scope (Must ship)
1. Live hazard alert flow from camera/inference stream to spoken warning.
2. Accessibility map with seeded pins and legend colors.
3. Big mic button: speech -> answer -> spoken response.
4. SOS button sends location link via SMS.

### Out of Scope (If time runs out)
1. Fully working delivery-partner contribution app flow.
2. Full live family tracking dashboard.
3. Advanced route optimization by accessibility constraints.
4. Hardware implementation (mention only as roadmap).

## 4. User Stories
1. As a visually impaired user, I want immediate spoken warnings for nearby hazards, so I can avoid danger.
2. As a mobility-impaired user, I want to know if a place has ramp/lift/path access before I go, so I can plan safely.
3. As a user, I want a voice assistant in Hindi/English, so I can navigate hands-free.
4. As a user, I want one-tap SOS to trusted contacts, so I can get help quickly.

## 5. Functional Requirements
### F1 Hazard Detection Alerts
- Input: hazard events from on-device model stream.
- Output: spoken alert containing hazard, approximate distance, and direction.
- Alert policy:
  - high: immediate voice alert
  - medium: short earcon + optional voice
  - low: log only

### F2 Voice Agent
- Press-and-hold or tap mic button.
- Convert speech to text.
- Build context using: current location, nearby pins, recent hazards.
- Generate concise answer.
- Convert answer to speech and play audio.

### F3 Accessibility Map
- Render map centered around user/Indore demo area.
- Render pins with status colors:
  - green: accessible
  - amber: partial
  - red: inaccessible
  - grey: unknown/no data
- Show pin detail sheet with score and attributes.

### F4 SOS
- One action to send emergency message.
- Message includes live map link with coordinates.
- Send to up to 3 trusted contacts.

## 6. Non-Functional Requirements
- Accessibility-first UI: large touch targets, high contrast, screen reader labels.
- Graceful offline behavior for core app shell and hazard alerts.
- Voice path can degrade offline with clear user messaging.
- App should stay usable with intermittent network.

## 7. Offline-First Requirements
- App must boot and navigate core screens without internet.
- Last-synced pins must be cached locally.
- Pending actions (optional pin updates) should queue and retry when online.
- Hazard alerting must not depend on cloud.
- If cloud voice unavailable, app plays fallback: "Network unavailable, try again" and remains functional.

## 8. Success Criteria (Demo)
- Hazard spoken alert appears during live obstacle demo.
- Map displays at least 6 Indore pins with mixed statuses.
- Mic query returns spoken answer in under 3 seconds on stable network.
- SOS message arrives to at least one recipient during demo.

## 9. Team Ownership
- You (Backend/AWS): APIs, voice pipeline, data, SMS/SOS, auth baseline.
- Urvashi (React Native): app UI, offline cache, map, mic/sos controls, API integration.
- Prakhyat (ML): on-device hazard model pipeline + event contract.

## 10. API and Data Contracts (must freeze early)
- Freeze hazard event schema by Hour 4.
- Freeze pin schema and API response by Hour 4.
- Freeze voice API request/response by Hour 6.
- Freeze SOS API by Hour 6.

(See INTEGRATION_CONTRACTS.md for exact payloads.)

## 11. Risks and Mitigation
1. Voice latency too high -> Keep prompts short and constrain response length.
2. Model integration delays -> Start with mocked hazard events, then swap real stream.
3. Network failure -> Ensure cached pins and local hazard alerts still demoable.
4. SMS issues -> Keep backup: trigger to one verified number, capture proof screenshot.

## 12. Demo Plan (90 sec)
1. Hazard detection alert (20s)
2. Accessibility map pins (20s)
3. Voice mic query in Hindi/English (25s)
4. SOS send + receipt (15s)
5. Hardware roadmap one-liner (10s)
