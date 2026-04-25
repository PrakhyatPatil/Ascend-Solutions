# Integration Contracts (Freeze These Early)

## 1. Hazard Event Contract (ML -> App)
Transport options:
- Preferred: local websocket stream from native layer to React Native.
- Temporary fallback: polled JSON file or mocked event emitter.

Schema:
```json
{
  "timestamp": "2026-04-25T13:45:10Z",
  "hazard": "vehicle",
  "confidence": 0.87,
  "distance_estimate": "near",
  "direction": "left",
  "alert_level": "high"
}
```

Allowed values:
- hazard: vehicle | step | pothole | barrier | crowd | wet_floor | unknown
- distance_estimate: near | mid | far
- direction: left | center | right
- alert_level: high | medium | low

## 2. Pins API Contract (Backend -> App)
### GET /pins/nearby?lat={lat}&lng={lng}&radius_m={radius}
Response:
```json
{
  "pins": [
    {
      "id": "pin_001",
      "name": "Treasure Island Mall",
      "lat": 22.7284,
      "lng": 75.8858,
      "score": 4,
      "status": "green",
      "entry_access": "ramp",
      "lift_status": "working",
      "path_quality": "smooth",
      "blockage": "clear",
      "accessible_toilet": "yes",
      "last_updated_at": "2026-04-25T09:00:00Z"
    }
  ]
}
```

Status values:
- green | amber | red | grey

## 3. Voice Agent Contract (App -> Backend)
### POST /voice/query
Request:
```json
{
  "user_id": "u_123",
  "lat": 22.7196,
  "lng": 75.8577,
  "query_text": "Kya yahan mall ka entrance accessible hai?",
  "recent_hazards": [
    {
      "hazard": "vehicle",
      "distance_estimate": "near",
      "direction": "left",
      "alert_level": "high"
    }
  ]
}
```

Response:
```json
{
  "answer_text": "Haan, entrance accessible hai. Ramp aur working lift available hai.",
  "audio_url": "https://.../polly-output.mp3",
  "language": "hi-IN"
}
```

## 4. SOS Contract (App -> Backend)
### POST /sos/trigger
Request:
```json
{
  "user_id": "u_123",
  "lat": 22.7196,
  "lng": 75.8577,
  "contacts": ["+9198xxxxxx12"],
  "message": "Emergency! Please check my location."
}
```

Response:
```json
{
  "ok": true,
  "sent": 1,
  "tracking_url": "https://maps.google.com/?q=22.7196,75.8577"
}
```

## 5. Error Contract (all APIs)
```json
{
  "ok": false,
  "error_code": "NETWORK_UNAVAILABLE",
  "message": "Please retry in a moment"
}
```

## 6. Versioning
- Add `x-api-version: 1` header on app requests.
- Breaking changes require a new version and quick team sync.
