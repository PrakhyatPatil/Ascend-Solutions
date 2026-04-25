# Navable AI Agent Implementation Guide: Tool-Calling & Voice Integration

This document outlines how to implement the **Live AI Agent** (Low-Latency, Non-Turn-Based) using the **VaaniSeva Tool-Tag Pattern** and AWS Lambda.

## 1. Architecture Overview
The agent uses **LiveKit** for the voice loop and **AWS Lambda (Bedrock Nova Lite)** for intelligence. Instead of complex JSON schemas, the agent outputs plain text with **Action Tags** (e.g., `[FETCH_PINS]`) that the system intercepts to perform real-world actions.

## 2. The Agent Planning Loop (AWS Lambda)

### Prompt Strategy (The "Brain")
Located in `backend/lambda_handler.py`, the system prompt instructs the AI to use specific tags for tools. 

**Core Tools defined for Navable:**
- `[FETCH_PINS]`: Triggers a DynamoDB scan for nearby accessibility markers.
- `[SOS_ALERT]`: Triggers an SNS notification to the emergency contact.
- `[HAZARD_QUERY]`: Asks the ML model on-device for current hazards.

### Handling Multi-Step Reasoning
The agent does not just "talk." It follows this cycle:
1. **User Voice** -> Transcribed by LiveKit/Whisper.
2. **Brain (Bedrock)** -> Receives text + History.
3. **Planning** -> AI outputs: *"I'll check the pins for you. [FETCH_PINS]"*
4. **Execution** -> Lambda detects `[FETCH_PINS]`, queries DynamoDB, and appends the result to the AI's memory.
5. **Speech** -> AI says: *"I found 2 ramps and one broken sidewalk nearby."*

## 3. AWS Setup for the Team

### Step A: Bedrock Access
1. Go to **AWS Console** -> **Amazon Bedrock**.
2. Go to **Model Access** (Bottom left).
3. Ensure **Amazon Nova Lite** (or Titan/Claude) is "Access Granted".

### Step B: Lambda Deployment
1. Use the provided script: `backend/deploy_with_existing_role.ps1`.
2. This creates a **Function URL**. This URL is what the Frontend uses to "talk" to the brain.

## 4. Merging Frontend and Backend

### Environment Configuration
Ensure `NavableApp/src/config/env.ts` matches your live deployment:
```typescript
export const ENV = {
  API_URL: "YOUR_LAMBDA_FUNCTION_URL", // From AWS CLI/Console
  SOS_TARGET_PHONE: "+91XXXXXXXXXX",
  ENABLE_REMOTE_SOS: true 
};
```

### The LiveKit Agent Connector (Python)
To turn this into a live voice agent, run the LiveKit agent runner:
1. Load `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET`.
2. Connect the `agent.on_user_speech_finished` event to your **AWS Lambda URL**.
3. Stream the Lambda's text response back into the LiveKit **TTS (Text-to-Speech)** engine.

## 5. Merging Features (The Hackathon Win)
- **Pins feature**: AI must be able to say "Mark this location as inaccessible."
- **SOS feature**: Voice command "Help me" must trigger the SNS backend.
- **ML Integration**: When the user asks "What's in front of me?", the app sends the last hazard detection from Prakhyat's module to the AI context.

---
*Created by GitHub Copilot for Navable Team.*
