# Backend AWS Plan (Your Workstream)

## 1. Objective
Ship stable backend endpoints for pins, voice agent, and SOS with minimal ops overhead.

## 2. MVP Services
- API Gateway + Lambda (3 endpoints)
- DynamoDB (pins, users)
- Bedrock (Nova Lite)
- Transcribe + Polly (or simplified text-query path first)
- SNS for SOS SMS

## 3. Endpoint List
1. GET /pins/nearby
2. POST /voice/query
3. POST /sos/trigger

Reference exact payloads in INTEGRATION_CONTRACTS.md.

## 4. Fast Delivery Sequence
1. Deploy GET /pins/nearby with seeded data in DynamoDB.
2. Deploy POST /sos/trigger with one verified destination first.
3. Deploy POST /voice/query in text-in/text-out mode first.
4. Add TTS URL response once stable.
5. Add STT integration when app mic path is ready.

## 5. DynamoDB Suggested Tables
### AccessibilityPins
- PK: pin_id
- GSI1PK: geo_bucket (example: geohash prefix or city_zone)
- attributes: name, lat, lng, score, status, entry_access, lift_status, path_quality, blockage, accessible_toilet, last_updated_at

### Users
- PK: user_id
- attributes: trusted_contacts[], preferred_language, created_at

## 6. Reliability Rules
- Return consistent error contract.
- Never fail with HTML error pages; always JSON.
- Keep latency low by short LLM prompts and constrained responses.
- Add CloudWatch logs with request_id in all responses.

## 7. Demo Safety Nets
- Keep seeded pin JSON fallback inside Lambda if DynamoDB read fails.
- Keep one hardcoded SOS test number for dry runs.
- Keep fallback text response if Bedrock call times out.

## 8. Copilot Prompt You Can Paste
"Create AWS Lambda handlers (Node.js/TypeScript) for GET /pins/nearby, POST /voice/query, and POST /sos/trigger with API Gateway events. Use DynamoDB for pin data, SNS for SMS, and Bedrock Nova Lite for concise voice answers. Enforce typed request/response contracts and return standardized JSON errors. Include CloudWatch-friendly structured logging and environment variable validation."
