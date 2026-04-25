# LiveKit + Agentic AI Feasibility (Research Summary)

## Scope
Goal: Decide whether to use a LiveKit-based live calling architecture for Navable with strict end-to-end latency target under 3 seconds.

Codebases reviewed:
- VaaniSeva
- Halo

## Key Findings

### VaaniSeva
- Uses Twilio-based voice pipeline, not LiveKit.
- Strong production voice orchestration pattern exists: STT -> LLM -> TTS with AWS-backed logic.
- Inferred speech-to-speech latency is usually around 3 to 4 seconds, with faster paths possible.
- Conclusion: good voice-agent orchestration reference, but not directly a LiveKit implementation.

### Halo
- Uses LiveKit on AWS EC2 and works well for real-time room/media behavior.
- Great reference for token issuance, room management, and WebRTC room lifecycle.
- Does not include a complete real-time speech-to-speech AI voice stack out of the box.
- Some architecture choices can hurt latency if copied as-is (notably cross-region data access and blocking AI calls).

## Can LiveKit Meet <3s?
Yes, but only with the right pipeline design.

### Go Conditions (must satisfy)
1. Real-time streaming STT (not batch transcription).
2. Fast LLM path with strict output limits.
3. Streaming or low-start-latency TTS playback.
4. Context reads from low-latency cache/store in same region.
5. No cross-region hot-path database calls.
6. Timeouts + fallback responses to avoid long stalls.
7. Warmed compute path for agent runtime.

### Risk Conditions (likely to miss <3s)
1. Blocking request/response speech chain.
2. Cross-region database reads in voice hot path.
3. Long prompts and long model responses.
4. Cold starts on critical voice handlers.
5. No cache for session context.

## Recommendation
- Decision: GO with LiveKit for Navable live calling.
- Reason: You already have proven ops experience with LiveKit on EC2, and it is suitable for web/mobile live voice sessions.
- Constraint: Build a true streaming voice pipeline and keep all critical services region-local.

## Suggested Architecture for Navable
1. Client joins LiveKit room.
2. Agent participant joins room (server-side agent worker).
3. User audio -> streaming STT.
4. Agent retrieves lightweight session context (nearby pins, recent hazards).
5. LLM generates short response (max 1 to 2 sentences).
6. TTS audio streamed back into room.
7. Intent actions (SOS, pin checks) executed via backend APIs.

## Latency Budget Target (practical)
- STT partials: 0.4 to 0.9s
- Context fetch: 0.05 to 0.2s
- LLM reasoning: 0.4 to 0.9s
- TTS first audio start: 0.3 to 0.8s
- Transport overhead: 0.1 to 0.3s
- Total: 1.25 to 3.1s

Interpretation:
- Under clean conditions and optimized setup, under 3 seconds is realistic.
- Without optimization, you may drift above 3 seconds.

## What to Reuse Right Now
- From Halo: LiveKit room, token service, deployment pattern on AWS.
- From VaaniSeva-style architecture: voice-agent orchestration discipline, fallback handling, short-response policies.

## Final Go/No-Go
- Go: Yes, use LiveKit.
- Condition: enforce streaming pipeline + same-region low-latency backend design from day one.
