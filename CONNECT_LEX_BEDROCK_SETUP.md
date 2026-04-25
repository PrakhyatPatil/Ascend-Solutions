# Complete Setup: Amazon Connect + Lex + Bedrock (Live Voice Agent)

## 0. Prerequisites
- AWS account with permissions for Connect, Lex V2, Lambda, Bedrock, DynamoDB, CloudWatch, SNS.
- Bedrock model access enabled in your selected region.
- One verified test phone number for SOS path.

## 1. Create Core Resources
1. Create DynamoDB tables:
   - Users
   - AccessibilityPins
2. Create SNS topic for SOS notifications.
3. Create IAM roles:
   - Lambda execution role (DynamoDB read/write, Bedrock invoke, SNS publish, logs).
   - Connect and Lex service-linked roles.

## 2. Lambda Fulfillment Service
Create one main Lambda (Node.js or Python):
- Input: Lex event payload.
- Steps:
  1. Parse user intent and slots.
  2. Load user context (location, language, trusted contacts).
  3. Query nearby pins when needed.
  4. Read recent hazards from your event store.
  5. Call Bedrock with compact prompt.
  6. Return short response to Lex.
  7. If SOS intent, publish SNS and return confirmation.

Keep strict timeout and fallback message:
- Timeout target: 3 to 5 seconds max.
- Fallback: "I am having trouble right now, but I can still trigger SOS if needed."

## 3. Build Lex V2 Bot
1. Create bot with locales:
   - en-IN
   - hi-IN
2. Define intents:
   - CheckAccessibilityIntent
   - NearbySafeRouteIntent
   - HazardStatusIntent
   - TriggerSOSIntent
   - RepeatIntent
   - FallbackIntent
3. Turn on voice support and interruption handling.
4. Connect all main intents to Lambda fulfillment.
5. Keep prompts short and directive.

## 4. Build Amazon Connect Instance
1. Create Connect instance.
2. Claim/start number or use web-only agent flow for demo.
3. Build contact flow:
   - Entry prompt
   - Get customer input (Lex)
   - Route to Lex bot
   - Error branch fallback
4. Enable contact trace records.

## 5. Web Integration (Live Calling)
1. Embed Amazon Connect CCP in your web app.
2. Authenticate user/session.
3. Configure CCP with your Connect instance URL.
4. Add one-click "Talk to Navable" button.

Result:
- User can start a real-time voice call from web.
- Conversation remains live and interruptible.

## 6. Bedrock Prompt Pattern (for Low Latency)
System prompt:
- You are Navable voice assistant for accessibility navigation in India.
- Respond in maximum 2 short sentences.
- Prioritize immediate safety and clarity.
- Use Hindi if user speaks Hindi, else English.

Context payload:
- user location
- top 5 nearby pins
- last 3 hazard events
- SOS contact availability

## 7. Observability
- CloudWatch Logs: Lambda, Lex, Connect.
- Add session_id and user_id to all logs.
- Track metrics:
  - Lambda duration
  - Bedrock latency
  - Lex intent fallback rate
  - SOS success count

## 8. Fail-Safe Behaviors
1. If Bedrock fails, return fixed response from Lambda.
2. If pin lookup fails, return nearest known accessible fallback.
3. If SNS fails, inform user and ask retry confirmation.

## 9. Hackathon Demo Hardening
1. Seed 6 Indore pins before demo.
2. Keep one deterministic question and response flow prepared.
3. Pre-warm Lambda by test ping before stage demo.
4. Keep backup recorded demo video.

## 10. Optional Phase 2 (Post Hackathon)
- Add streaming transcript panel in web UI.
- Add session memory and personalization.
- Add proactive hazard push to voice session.
- Add native app to call same Connect flow.
