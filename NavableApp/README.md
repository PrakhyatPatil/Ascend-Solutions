# NavableApp (Urvashi Frontend Track)

React Native CLI TypeScript app for Navable hackathon MVP.

## What Is Implemented

- 3-tab shell: Home, Map, Safety
- Offline banner via NetInfo
- Pins offline-first flow:
	- API fetch when online
	- AsyncStorage cache fallback
	- Seeded Indore pins fallback if no cache exists
- Hazard mock stream with high/medium/low events
- High-alert TTS speech output
- Voice query service client for `POST /voice/query`
- SOS service client for `POST /sos/trigger`
- Typed contracts aligned with `INTEGRATION_CONTRACTS.md`

## Project Structure

- `App.tsx` app shell + tabs + connectivity + hazard stream wiring
- `src/screens` Home, Map, Safety screens
- `src/components` Mic button, offline banner, hazard toast, pin legend
- `src/services` API, pins, voice, SOS, hazard stream, TTS
- `src/offline` cache, queue, sync manager
- `src/types/contracts.ts` payload and response types

## Quick Start

From `NavableApp`:

```sh
npm install
npm start
```

In another terminal:

```sh
npm run android
```

## Configuration

Update base API URL in:

- `src/config/env.ts`

Current placeholder:

- `https://example.execute-api.ap-south-1.amazonaws.com/prod`

LiveKit placeholders in the same file:

- `livekitWsUrl`
- `livekitTokenUrl`

## Integration Notes

- ML bridge can call `pushNativeHazardEvent` in `src/services/hazardStreamService.ts`
- `x-api-version: 1` header is sent on API requests
- Voice and SOS gracefully handle network failures

## Validation Commands

```sh
npm run lint
npx tsc --noEmit
```
