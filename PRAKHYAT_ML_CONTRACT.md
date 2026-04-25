# Prakhyat Guide: ML Workstream + Integration Contract

## 1. Your Objective
Deliver reliable on-device hazard events that the app can consume in real time.

The team does NOT need perfect model accuracy for hackathon win.
The team needs stable event output + visible live alerts.

## 2. Deliverables
1. On-device inference pipeline running on Android test phone.
2. Event emitter sending hazard JSON at regular cadence.
3. Alert-level policy (high/medium/low) agreed with app team.
4. Quick calibration notes for demo environment.

## 3. Event Contract (must match exactly)
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

## 4. Practical Heuristics (good enough for demo)
- distance_estimate from bbox size thresholds.
- direction from bbox center x-position.
- alert_level:
  - high: near + confidence >= 0.65
  - medium: mid + confidence >= 0.5
  - low: far or low confidence

## 5. Transport to App
Preferred options (in order):
1. Native bridge callback into React Native module.
2. Local websocket server stream.
3. Temporary JSON polling output (last resort for demo).

## 6. Test Script for Integration
Create 3 fixed synthetic events to verify app behavior:
1. high-left-vehicle
2. medium-center-step
3. low-right-crowd

App must:
- speak immediately on high
- earcon or soft alert on medium
- log only on low

## 7. Copilot Prompt You Can Paste
"I need Android on-device hazard detection output for a React Native app integration. Focus on stable JSON event emission and low latency rather than perfect model accuracy. Implement distance and direction heuristics from detection boxes, map confidence to alert levels, and expose events through a bridge or local websocket. Keep schema fixed and provide a test emitter with deterministic events for integration testing."
