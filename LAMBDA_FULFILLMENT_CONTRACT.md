# Lambda Fulfillment Contract for Lex Voice Agent

## Input (from Lex)
Expected fields to consume:
- sessionId
- inputTranscript
- sessionState.intent.name
- sessionState.sessionAttributes
- localeId

## Internal Context Assembly
1. Resolve user_id from session attributes.
2. Resolve user location from session attributes or recent app update.
3. Load nearest pins from AccessibilityPins.
4. Load recent hazards from your hazard store.
5. Build compact Bedrock prompt.

## Output (to Lex)
Return structure should include:
- sessionState.dialogAction
- sessionState.intent
- messages
- sessionState.sessionAttributes (updated)

Example message object:
{
  "contentType": "PlainText",
  "content": "Haan, entrance accessible hai. Ramp aur lift dono available hain."
}

## Suggested Intent Routing
- CheckAccessibilityIntent -> lookup pins and answer.
- HazardStatusIntent -> read recent hazards.
- NearbySafeRouteIntent -> respond with nearest safer option.
- TriggerSOSIntent -> call SNS and confirm dispatch.
- FallbackIntent -> short clarification prompt.

## Response Style Rules
- Maximum 2 sentences.
- Safety first.
- Avoid technical wording.
- Respect locale.

## Error Handling
- Never throw raw errors to Lex.
- Return calm fallback prompt.
- Log full exception with sessionId.
