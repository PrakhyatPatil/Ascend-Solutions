# India-Region Live Voice Plan (No Amazon Connect)

## Reality Check
Amazon Connect is not available in India region, so we should not depend on it for your core demo stack.

## Best Alternative (Fast + Live)
Use Amazon Lex V2 Streaming APIs directly from web and app, with Lambda fulfillment calling Bedrock.

Why this works:
- Live conversational voice session (not chat turns).
- User can keep speaking naturally.
- No Connect dependency.
- Works with web and mobile clients.
- Reuses your backend, DynamoDB, SNS, and Bedrock logic.

## Target Architecture
1. Web or app client captures mic audio stream.
2. Client sends audio stream to Lex V2 streaming endpoint.
3. Lex handles speech and dialog state live.
4. Lex invokes Lambda fulfillment.
5. Lambda loads context from DynamoDB (pins, hazards, profile).
6. Lambda calls Bedrock for concise response text.
7. Lex returns voice response to client.
8. SOS intent triggers SNS inside Lambda.

## Region Strategy
Option A (preferred for simplicity):
- Run Lex in a nearby supported region, for example ap-southeast-1.
- Keep DynamoDB and other services in your main region.
- For hackathon latency this is acceptable.

Option B (single-region strict):
- Build custom WebRTC or WebSocket speech pipeline with Transcribe Streaming + Polly + Bedrock.
- More control, but more engineering risk in hackathon time.

Recommendation:
- Use Option A for idea selection and MVP delivery.

## What Changes from Previous Plan
- Remove Amazon Connect dependency.
- Keep Lex, Lambda, Bedrock, DynamoDB, SNS.
- Use Lex web or SDK integration for live voice UX.

## Build Steps (Baby-Step)
1. Create Lex V2 bot with en-IN and hi-IN locale.
2. Create intents:
   - CheckAccessibilityIntent
   - HazardStatusIntent
   - TriggerSOSIntent
   - FallbackIntent
3. Create one Lambda fulfillment function.
4. In Lambda:
   - Parse Lex event
   - Fetch nearby pins and recent hazards
   - Call Bedrock
   - Return max 2 sentence response
   - Trigger SNS on SOS intent
5. Integrate client voice streaming with Lex runtime SDK.
6. Add Cognito identity for web/app auth.
7. Test live conversation from browser.

## Minimal Intent Design for Demo
- CheckAccessibilityIntent
  Sample: Is the mall entrance accessible?
- HazardStatusIntent
  Sample: Any hazard near me right now?
- TriggerSOSIntent
  Sample: Send SOS now.
- FallbackIntent
  Sample: I did not get that, can you repeat?

## Lambda Fulfillment Rules
- Keep response under 2 sentences.
- Safety-first wording.
- If Bedrock timeout, use fallback sentence.
- Never fail silently.

## Fallback if Lex Region Is Also Problematic
Use this backup pipeline:
- Browser mic -> API Gateway WebSocket -> Lambda -> Transcribe Streaming -> Bedrock -> Polly -> browser playback.
This is powerful but more complex. Keep as backup only.

## Demo Flow
1. User opens web page and taps Start Voice.
2. User asks in Hindi or English.
3. Agent replies with accessibility and hazard-aware answer.
4. User says emergency phrase.
5. Lambda triggers SNS and confirms SOS sent.

## Judge-Friendly Positioning
- We built a live voice accessibility assistant without telephony lock-in.
- System is cloud-native, modular, and ready for India scale.
