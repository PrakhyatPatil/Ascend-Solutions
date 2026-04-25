# Live Voice Backend Recommendation (AWS-Native, Low-Latency)

## Decision
Use Amazon Connect + Amazon Lex V2 + AWS Lambda + Bedrock + DynamoDB as the primary live voice agent stack.

Why this is the best fit for your requirement:
- Real-time calling across web is already solved by Amazon Connect softphone/CCP.
- Streaming speech and barge-in are already handled by Lex voice sessions.
- You avoid building custom full-duplex WebRTC and speech orchestration from scratch.
- You can still use Bedrock for intelligent responses and app context.

## What You Get
1. Live voice conversation (not turn-based button chat).
2. Barge-in behavior (user can interrupt).
3. Web integration via embedded Amazon Connect CCP.
4. Backend control over context, memory, and actions through Lambda.

## High-Level Architecture
1. User opens web app with embedded Amazon Connect CCP.
2. User starts voice session.
3. Connect routes call to Lex V2 bot.
4. Lex invokes Lambda fulfillment for each conversational step.
5. Lambda fetches live context from DynamoDB and app APIs (pins, hazards, profile).
6. Lambda calls Bedrock model for concise answer.
7. Lex speaks response immediately and continues listening.
8. Optional actions (SOS trigger, route fetch, contact lookup) are called from Lambda.

## Why This Is Faster Than Custom Realtime Stack
- Custom realtime stack requires WebRTC media servers, stream multiplexing, VAD, STT/TTS orchestration, and interruption handling.
- Connect + Lex gives this operationally on day one.

## Latency Targets (Realistic)
- Speech capture to transcript partials: sub-second to low seconds depending on network.
- Lambda + Bedrock response generation: aim 400ms to 1200ms with short prompts.
- End-to-end perceived response: 1.5s to 3s in demo settings.

## How To Keep It Feeling Live
1. Keep responses short (1 to 2 sentences).
2. Add strict system prompt for concise output.
3. Use fast Bedrock model tier for voice path.
4. Store and pass only necessary context (last hazards, nearby pins, locale).
5. Use Lex prompts for immediate filler while Lambda finishes heavy reasoning.

## Where Your Existing APIs Fit
- GET pins nearby: reused by Lambda to answer accessibility questions.
- SOS trigger: invoked by Lambda when user asks for help.
- User profile and trusted contacts: read from DynamoDB.

## Security and Reliability
- Cognito or Connect auth for web entry.
- IAM least privilege per Lambda.
- CloudWatch logs with correlation IDs per session.
- Fallback utterance if Bedrock timeout happens.

## MVP Build Order (Backend)
1. Create Connect instance and contact flow.
2. Create Lex V2 bot (Hindi plus English locale).
3. Create Lambda fulfillment and Bedrock call.
4. Connect contact flow to Lex bot.
5. Add DynamoDB context lookup.
6. Add action handlers for SOS and pin query.
7. Embed CCP in web app and run call tests.

## When To Use Chime Instead
Use Chime SDK only if you need full custom call UX, custom media pipeline, or multi-party conferencing logic that Connect flow cannot provide in time.
For hackathon speed and reliability, Connect is the safer choice.
