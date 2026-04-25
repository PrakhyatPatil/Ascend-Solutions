# navable-livekit-token Lambda

Purpose: Generate LiveKit room tokens for app clients and AI participants.

## Environment Variables
- LIVEKIT_API_KEY
- LIVEKIT_API_SECRET

## Request
POST body:
{
  "roomName": "navable-room-1",
  "participantName": "user-device-1",
  "canPublish": true,
  "canSubscribe": true,
  "ttl": "10m"
}

## Response
{
  "ok": true,
  "token": "...",
  "identity": "user-device-1-abc123",
  "roomName": "navable-room-1"
}
