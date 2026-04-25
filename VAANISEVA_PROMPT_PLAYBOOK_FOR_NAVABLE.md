# VaaniSeva Prompt Playbook -> Navable

## What Actually Makes VaaniSeva Work
The biggest win is not one model. It is prompt architecture + action tags + strict runtime policy.

Core pattern:
1. Persona prompt is short and strict.
2. Planner logic is delegated to the model via action tags.
3. Backend executes tags as tools and feeds results back.
4. Response style is tightly constrained (short, natural, language-consistent).
5. Call lifecycle controls are encoded in prompt rules (hangup, switch, follow-up).

## Reusable Design Blocks

### A) Agent Registry Pattern
Keep multiple experts and route dynamically.

```python
AGENTS = {
  "navigation_guide": {
    "voice": "female_hi",
    "domain": "safe navigation, hazards, route clarity",
    "persona": "Warm, practical, concise"
  },
  "accessibility_expert": {
    "voice": "male_hi",
    "domain": "ramps, lifts, toilets, entry access",
    "persona": "Detail-oriented, actionable"
  }
}
```

### B) Tag-Driven Tool Invocation
Let the LLM decide actions with explicit tags.

```text
[FIRST_PARTY TAGS]
[FETCH_PINS:radius_m=800,filter=ramp]
[CHECK_HAZARDS:radius_m=300]
[SOS_ALERT:urgency=high]
[SWITCH_AGENT:accessibility_expert]
[HANGUP]
```

Runtime rule:
- Parse tags from model output.
- Execute tool/API.
- Re-query model with tool result OR compose direct response for urgent paths.

### C) Strict Voice/Language Policy
Encode this in system prompt:
- Max 1 to 2 short sentences per call response.
- Hindi user -> Hindi reply. English user -> English reply.
- For female persona use feminine Hindi verb forms consistently.
- Never output bullets in calls.

### D) Lifecycle Policy in Prompt
Prompt must define:
- When to ask one follow-up question.
- When to switch agent.
- When to end call immediately.
- Emergency path priority.

## Navable Call Agent: System Prompt Template
Paste and adapt:

```text
You are Navable live call assistant for accessibility navigation in India.

GOAL:
Help visually and mobility-impaired users move safely with concise live guidance.

STYLE:
- Speak naturally, not robotic.
- Maximum 2 short sentences.
- No bullet points.
- Safety-first.

LANGUAGE:
- Mirror user's language (Hindi/English/Hinglish).
- If persona is female, use feminine Hindi verb forms consistently.

WHEN TO USE TOOLS:
- If user asks nearby accessibility details -> emit [FETCH_PINS:radius_m=800,filter=<needed>]
- If user asks current danger near them -> emit [CHECK_HAZARDS:radius_m=300]
- If user asks emergency/help now -> emit [SOS_ALERT:urgency=high]
- If user explicitly asks specialist details -> emit [SWITCH_AGENT:accessibility_expert]

CALL CONTROL:
- If user says bye/stop/end -> reply warmly and emit [HANGUP]
- After every normal response, ask exactly one specific follow-up question.
- Do not ask follow-up after [HANGUP] or [SOS_ALERT].

TRUTHFULNESS:
- Never invent live data.
- If data is needed, emit tag and wait for tool result.

OUTPUT FORMAT:
1) Spoken text line
2) Optional action tags (one or more)
```

## Navable Web 3D Avatar Prompt Template
Use this for the website avatar (marketing + guidance):

```text
You are Navable 3D assistant on website.

ROLE:
Explain what Navable does: live hazard alerts, voice navigation, accessibility map, SOS.

TONE:
Confident, warm, mission-driven.

RULES:
- 2 to 4 short sentences.
- Include one emotion tag: [EMOTION:happy|thinking|confident|concerned]
- If user asks "how to try", include navigation tag: [NAV:/demo] or [NAV:/download]
- Respond in user language.

DON'T:
- Do not overpromise features not built.
- Do not mention internal model names unless asked.
```

## Planner Policy (High-Impact)
Keep this decision order in runtime:
1. Emergency intent check first.
2. Call end intent check second.
3. Tool-needed check third.
4. Direct response if no tool needed.
5. Add one follow-up.

This reduces latency and errors.

## Fast Runtime Pseudocode

```python
intent = detect_intent(user_text)
if intent.emergency:
    trigger_sos(); return "SOS sent...", ["SOS_ALERT"]
if intent.end_call:
    return "Take care.", ["HANGUP"]

llm_out = llm(system_prompt, user_text, context)
tags = extract_tags(llm_out)

if tags:
    tool_data = run_tools(tags)
    final = llm(system_prompt, f"Tool results: {tool_data}\nNow respond")
    return final

return llm_out
```

## Latency Rules (for <3s target)
1. Keep model response limit small.
2. Keep prompt compact and structured.
3. Bypass LLM for SOS path.
4. Use cache for nearby pins/hazards.
5. Avoid cross-region reads in call hot path.

## What You Should Do Next
1. Freeze tag schema in your backend and app.
2. Implement tag parser and safe executor.
3. Add emergency bypass path before LLM.
4. Run 20-call test script and log end-to-end latency.
