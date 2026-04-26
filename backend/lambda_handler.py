import base64
import hmac
import json
import math
import os
import re
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError


ddb = boto3.resource("dynamodb")
sns = boto3.client("sns")
bedrock = boto3.client("bedrock-runtime")
rekognition = boto3.client("rekognition")

TABLE_NAME = os.getenv("ACCESSIBILITY_PINS_TABLE", "navable-accessibility-pins")
SOS_TOPIC_ARN = os.getenv("SOS_TOPIC_ARN", "")
BEDROCK_MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "amazon.nova-lite-v1:0")
NAVABLE_API_KEY = os.getenv("NAVABLE_API_KEY", "").strip()
DETECTION_API_URL = os.getenv("DETECTION_API_URL", "").strip()
DETECTION_API_KEY = os.getenv("DETECTION_API_KEY", "").strip()
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "").strip()
AUTH_REQUIRED = os.getenv("AUTH_REQUIRED", "true").strip().lower() == "true"

TAG_PATTERN = re.compile(r"\[(?P<name>[A-Z_]+)(?::(?P<args>[^\]]+))?\]")
ALLOWED_AGENT_TAGS = {
    "FETCH_PINS",
    "CHECK_HAZARDS",
    "SOS_ALERT",
    "FETCH_DATA",
    "WEB_SEARCH",
    "SWITCH_AGENT",
    "SWITCH",
    "HANGUP",
}

AGENT_REGISTRY = {
    "navigator": {
        "name": "Navigator",
        "persona": "Warm and practical route guide for visually and mobility-impaired users.",
    },
    "accessibility_expert": {
        "name": "Accessibility Expert",
        "persona": "Detailed specialist for ramps, lifts, entries, and accessible facilities.",
    },
    "safety_guardian": {
        "name": "Safety Guardian",
        "persona": "Urgent and calm safety coach focused on hazards and emergency actions.",
    },
}

AGENT_SWITCH_ALIASES = {
    "navigator": "navigator",
    "guide": "navigator",
    "accessibility_expert": "accessibility_expert",
    "accessibility": "accessibility_expert",
    "expert": "accessibility_expert",
    "safety_guardian": "safety_guardian",
    "safety": "safety_guardian",
    "guardian": "safety_guardian",
}


def _headers():
    return {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    }


def _response(status_code, body):
    import decimal

    class _DecimalEncoder(json.JSONEncoder):
        """Convert DynamoDB Decimal to float so lat/lng aren't returned as strings."""
        def default(self, obj):
            if isinstance(obj, decimal.Decimal):
                return float(obj)
            return super().default(obj)

    return {
        "statusCode": status_code,
        "headers": _headers(),
        "body": json.dumps(body, cls=_DecimalEncoder),
    }


def _is_authorized(event):
    if not AUTH_REQUIRED:
        return True

    if not NAVABLE_API_KEY:
        return False

    headers = event.get("headers") or {}
    provided_key = headers.get("x-navable-api-key") or headers.get("X-Navable-Api-Key") or ""

    auth_header = headers.get("authorization") or headers.get("Authorization") or ""
    if auth_header.lower().startswith("bearer "):
        bearer = auth_header[7:].strip()
        if hmac.compare_digest(bearer, NAVABLE_API_KEY):
            return True

    return hmac.compare_digest(provided_key, NAVABLE_API_KEY)


def _safe_json_loads(raw):
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def _parse_tag_args(raw_args):
    if not raw_args:
        return {}

    parsed = {}
    for token in raw_args.split(","):
        chunk = token.strip()
        if not chunk:
            continue
        if "=" not in chunk:
            parsed[chunk.lower()] = True
            continue
        key, value = chunk.split("=", 1)
        parsed[key.strip().lower()] = value.strip()
    return parsed


def _normalize_agent_key(value):
    if not value:
        return "navigator"
    return AGENT_SWITCH_ALIASES.get(str(value).strip().lower(), "navigator")


def _extract_legacy_tags(text):
    tags = []
    switch_matches = re.findall(r"\[SWITCH:([^\]]+)\]", text or "", flags=re.IGNORECASE)
    for target in switch_matches:
        tags.append(
            {
                "name": "SWITCH",
                "args": {"agent": _normalize_agent_key(target)},
                "raw": f"[SWITCH:{target}]",
            }
        )

    if re.search(r"\[HANGUP\]", text or "", flags=re.IGNORECASE):
        tags.append({"name": "HANGUP", "args": {}, "raw": "[HANGUP]"})

    return tags


def _extract_tags(text):
    if not text:
        return "", []

    tags = []
    for match in TAG_PATTERN.finditer(text):
        name = match.group("name")
        if name not in ALLOWED_AGENT_TAGS:
            continue
        tags.append(
            {
                "name": name,
                "args": _parse_tag_args(match.group("args")),
                "raw": match.group(0),
            }
        )

    tags.extend(_extract_legacy_tags(text))

    spoken_text = TAG_PATTERN.sub("", text)
    spoken_text = re.sub(r"\[SWITCH:[^\]]+\]", "", spoken_text, flags=re.IGNORECASE)
    spoken_text = re.sub(r"\[HANGUP\]", "", spoken_text, flags=re.IGNORECASE)
    spoken_text = re.sub(r"\s+", " ", spoken_text).strip()
    return spoken_text, tags


def _is_emergency_intent(query_text):
    lowered = (query_text or "").strip().lower()
    emergency_tokens = {
        "help me",
        "emergency",
        "sos",
        "save me",
        "urgent",
        "bachao",
        "madad",
    }
    return any(token in lowered for token in emergency_tokens)


def _detect_agent_switch_intent(query_text):
    lowered = (query_text or "").strip().lower()
    switch_phrases = {"switch", "connect", "talk to", "speak to", "change agent", "agent"}
    if not any(phrase in lowered for phrase in switch_phrases):
        return None

    for alias, canonical in AGENT_SWITCH_ALIASES.items():
        if alias in lowered:
            return canonical
    return None


# ── Sarvam AI language/speaker config (same team keys, reused from VaaniSeva infra)
SARVAM_LANG_CONFIG = {
    "hi": {"sarvam_code": "hi-IN", "speaker": "arya"},
    "en": {"sarvam_code": "en-IN", "speaker": "vidya"},
    "hinglish": {"sarvam_code": "hi-IN", "speaker": "arya"},
    "auto": {"sarvam_code": "hi-IN", "speaker": "arya"},
}


def _call_sarvam_tts(text, language="hi"):
    """Call Sarvam Bulbul v2 TTS. Returns base64 WAV string or None."""
    if not SARVAM_API_KEY or not text.strip():
        return None
    cfg = SARVAM_LANG_CONFIG.get(language, SARVAM_LANG_CONFIG["hi"])
    clean = re.sub(r"\[.*?\]", "", text).strip()
    if not clean:
        return None
    try:
        body = json.dumps({
            "inputs": [clean],
            "target_language_code": cfg["sarvam_code"],
            "speaker": cfg["speaker"],
            "model": "bulbul:v2",
            "pace": 1.05,
        }).encode("utf-8")
        req = urllib.request.Request(
            url="https://api.sarvam.ai/text-to-speech",
            data=body,
            headers={"Content-Type": "application/json", "api-subscription-key": SARVAM_API_KEY},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as r:
            result = json.loads(r.read().decode("utf-8"))
        return result.get("audios", [None])[0]
    except Exception as exc:
        print(f"Sarvam TTS failed: {exc}")
        return None


def _build_system_prompt(active_agent, language_hint="auto"):
    agent = AGENT_REGISTRY.get(active_agent, AGENT_REGISTRY["navigator"])
    return f"""You are Nova, Navable's AI companion assistant.

Navable is an accessibility navigation app for visually and mobility-impaired users in India.
You are self-aware: you are Nova, Navable's AI — not VaaniSeva, not any other product.
Your current specialisation is: {agent['name']} — {agent['persona']}

## YOUR MOST IMPORTANT RULES
1. Always speak like a warm, caring human companion — never like a database or a robot.
2. NEVER say you don't have data, you can't help, or you don't know.
   Instead: ask a warm follow-up, offer to check, or gently suggest the next step.
3. Mirror the user's language EXACTLY:
   - User speaks Hindi → you reply in Hindi.
   - User speaks Hinglish (mixed) → you reply in Hinglish.
   - User speaks English → you reply in English.
   - Use feminine Hindi verb forms: करती हूँ, जानती हूँ, मदद कर सकती हूँ.
4. Maximum 1–2 short spoken sentences per response. No bullet points. No lists. No jargon.
5. After every normal response, ask exactly ONE warm follow-up question.
6. EMERGENCY PATH — if user says help/bachao/madad/SOS → emit [SOS_ALERT] immediately, no questions.

## WHEN TO USE TOOLS
- User asks about nearby ramps/lifts/entrances → emit [FETCH_PINS:filter=ramp]
- User asks if path is safe → emit [CHECK_HAZARDS]
- User says emergency/help/bachao → emit [SOS_ALERT:urgency=high]
- User says stop/bye/band karo → emit [HANGUP]

## LANGUAGE SETTING
Preferred language hint: {language_hint}. Always mirror what the user actually says.
"""


def _haversine_m(lat1, lon1, lat2, lon2):
    # Simple great-circle distance in meters.
    r = 6371000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


def _query_nearby_pins(lat, lng, radius_m):
    table = ddb.Table(TABLE_NAME)
    result = table.scan()
    items = result.get("Items", [])

    pins = []
    for it in items:
        try:
            p_lat = float(it.get("lat"))
            p_lng = float(it.get("lng"))
        except (TypeError, ValueError):
            continue

        distance = _haversine_m(lat, lng, p_lat, p_lng)
        if distance <= radius_m:
            item = dict(it)
            item["distance_m"] = round(distance, 1)
            pins.append(item)

    pins.sort(key=lambda x: x.get("distance_m", 999999))
    return pins[:25]


def _matches_pin_filter(pin, filter_name):
    if not filter_name:
        return True

    normalized = str(filter_name).lower()
    if normalized == "ramp":
        return pin.get("entry_access") in {"ramp", "both"}
    if normalized == "lift":
        return pin.get("lift_status") == "working"
    if normalized == "toilet":
        return pin.get("accessible_toilet") == "yes"
    if normalized in {"clear", "clear_path"}:
        return pin.get("blockage") == "clear"
    return True


def _infer_pin_filter_from_query(query_text):
    lowered = (query_text or "").lower()
    if any(token in lowered for token in ["ramp", "wheelchair", "entry"]):
        return "ramp"
    if any(token in lowered for token in ["lift", "elevator"]):
        return "lift"
    if any(token in lowered for token in ["toilet", "washroom", "restroom"]):
        return "toilet"
    if any(token in lowered for token in ["clear path", "path clear", "blocked", "obstacle"]):
        return "clear"
    return None


def _trigger_sos(lat, lng, message):
    maps_url = f"https://maps.google.com/?q={lat},{lng}"
    full_msg = f"{message} Location: {maps_url}"

    sent = 0
    publish_error = None
    mode = "sns"
    if SOS_TOPIC_ARN:
        try:
            sns.publish(TopicArn=SOS_TOPIC_ARN, Message=full_msg, Subject="Navable SOS")
            sent = 1
        except ClientError as exc:
            publish_error = str(exc)
            mode = "fallback"
    else:
        mode = "fallback"

    return {
        "ok": True,
        "sent": sent,
        "tracking_url": maps_url,
        "error": publish_error,
        "mode": mode,
    }


def _http_post_json(url, payload, api_key="", timeout_s=12):
    body = json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    request = urllib.request.Request(url=url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=timeout_s) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        message = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"HTTP {exc.code}: {message}") from exc
    except Exception as exc:
        raise RuntimeError(str(exc)) from exc


def _default_detect_result(lat, lng):
    return {
        "hazards": [
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "hazard": "unknown",
                "confidence": 0.51,
                "distance_estimate": "mid",
                "direction": "center",
                "alert_level": "medium",
                "lat": lat,
                "lng": lng,
                "source": "fallback",
            }
        ],
        "provider": "fallback",
    }


def _label_to_hazard_name(label_name):
    lowered = (label_name or "").lower()
    if any(token in lowered for token in ["car", "truck", "bus", "vehicle", "motorcycle", "bicycle"]):
        return "vehicle"
    if any(token in lowered for token in ["person", "people", "crowd", "pedestrian"]):
        return "crowd"
    if any(token in lowered for token in ["stairs", "stair", "step"]):
        return "step"
    if any(token in lowered for token in ["barrier", "fence", "pole"]):
        return "barrier"
    if any(token in lowered for token in ["pothole", "hole"]):
        return "pothole"
    return "unknown"


def _confidence_to_alert(confidence):
    if confidence >= 0.75:
        return "high", "near"
    if confidence >= 0.55:
        return "medium", "mid"
    return "low", "far"


def _detect_with_rekognition(frame_b64, lat, lng):
    if not frame_b64:
        return []

    try:
        image_bytes = base64.b64decode(frame_b64, validate=True)
    except Exception:
        raise RuntimeError("frame_b64 is not valid base64")

    result = rekognition.detect_labels(
        Image={"Bytes": image_bytes},
        MaxLabels=10,
        MinConfidence=45,
    )

    hazards = []
    for label in result.get("Labels", [])[:5]:
        confidence = round(float(label.get("Confidence", 0)) / 100.0, 2)
        alert_level, distance_estimate = _confidence_to_alert(confidence)
        hazards.append(
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "hazard": _label_to_hazard_name(label.get("Name", "")),
                "confidence": confidence,
                "distance_estimate": distance_estimate,
                "direction": "center",
                "alert_level": alert_level,
                "lat": lat,
                "lng": lng,
                "source": "aws-rekognition",
                "label": label.get("Name", ""),
            }
        )

    return hazards


def _handle_detect_hazards(event):
    payload = _safe_json_loads(event.get("body"))
    lat = payload.get("lat")
    lng = payload.get("lng")
    image_url = payload.get("image_url", "")
    frame_b64 = payload.get("frame_b64", "")

    if lat is None or lng is None:
        return _response(400, {"ok": False, "error": "lat and lng are required"})

    if frame_b64:
        try:
            rekognition_hazards = _detect_with_rekognition(frame_b64, lat, lng)
            if rekognition_hazards:
                return _response(
                    200,
                    {
                        "ok": True,
                        "hazards": rekognition_hazards,
                        "provider": "aws-rekognition",
                    },
                )
        except Exception as exc:
            return _response(
                200,
                {
                    "ok": True,
                    "warning": f"rekognition_failed: {str(exc)}",
                    **_default_detect_result(lat, lng),
                },
            )

    if DETECTION_API_URL:
        try:
            provider_payload = {
                "lat": lat,
                "lng": lng,
                "image_url": image_url,
                "frame_b64": frame_b64,
            }
            provider_result = _http_post_json(
                DETECTION_API_URL,
                provider_payload,
                api_key=DETECTION_API_KEY,
            )
            hazards = provider_result.get("hazards") or []
            if hazards:
                return _response(200, {"ok": True, "hazards": hazards, "provider": "external"})
        except Exception as exc:
            return _response(
                200,
                {
                    "ok": True,
                    "warning": f"external_detection_failed: {str(exc)}",
                    **_default_detect_result(lat, lng),
                },
            )

    return _response(200, {"ok": True, **_default_detect_result(lat, lng)})


def _handle_delivery_request(event):
    payload = _safe_json_loads(event.get("body"))
    user_id = payload.get("user_id", "anonymous")
    lat = payload.get("lat")
    lng = payload.get("lng")
    items = payload.get("items") or []
    dropoff_note = payload.get("dropoff_note", "")

    if lat is None or lng is None:
        return _response(400, {"ok": False, "error": "lat and lng are required"})

    delivery_id = f"del_{uuid.uuid4().hex[:10]}"
    eta_minutes = 18
    maps_url = f"https://maps.google.com/?q={lat},{lng}"

    if SOS_TOPIC_ARN:
        try:
            sns.publish(
                TopicArn=SOS_TOPIC_ARN,
                Subject="Navable Delivery Request",
                Message=json.dumps(
                    {
                        "delivery_id": delivery_id,
                        "user_id": user_id,
                        "lat": lat,
                        "lng": lng,
                        "items": items,
                        "dropoff_note": dropoff_note,
                        "maps_url": maps_url,
                    },
                    ensure_ascii=False,
                ),
            )
        except ClientError:
            # Delivery request still returns local acknowledgement for demo reliability.
            pass

    return _response(
        200,
        {
            "ok": True,
            "delivery_id": delivery_id,
            "status": "requested",
            "eta_minutes": eta_minutes,
            "tracking_url": maps_url,
        },
    )


def _bedrock_reply(system_prompt, user_payload, max_tokens=120, temperature=0.2):
    response = bedrock.converse(
        modelId=BEDROCK_MODEL_ID,
        system=[{"text": system_prompt}],
        messages=[
            {
                "role": "user",
                "content": [{"text": json.dumps(user_payload, ensure_ascii=False)}],
            }
        ],
        inferenceConfig={"maxTokens": max_tokens, "temperature": temperature},
    )

    output = response.get("output", {}).get("message", {}).get("content", [])
    answer_text = ""
    for chunk in output:
        if "text" in chunk:
            answer_text += chunk["text"]
    return answer_text.strip()


def _execute_agent_tags(tags, lat, lng, recent_hazards, query_text=""):
    executed = []
    inferred_pin_filter = _infer_pin_filter_from_query(query_text)
    for tag in tags:
        name = tag.get("name")
        args = tag.get("args", {})

        if name == "FETCH_PINS":
            radius_m = float(args.get("radius_m", 800))
            requested_filter = args.get("filter") or inferred_pin_filter
            try:
                pins = _query_nearby_pins(float(lat), float(lng), radius_m)
                filtered = [pin for pin in pins if _matches_pin_filter(pin, requested_filter)]
                executed.append(
                    {
                        "tag": name,
                        "ok": True,
                        "requested_filter": requested_filter,
                        "count": len(filtered),
                        "pins": filtered[:5],
                    }
                )
            except Exception as exc:
                executed.append({"tag": name, "ok": False, "error": str(exc)})

        elif name == "CHECK_HAZARDS":
            executed.append(
                {
                    "tag": name,
                    "ok": True,
                    "hazards": (recent_hazards or [])[:3],
                }
            )

        elif name == "SOS_ALERT":
            if lat is None or lng is None:
                executed.append({"tag": name, "ok": False, "error": "lat and lng are required"})
            else:
                urgency = args.get("urgency", "high")
                message = f"Emergency ({urgency})! Please check my live location."
                executed.append({"tag": name, **_trigger_sos(lat, lng, message)})

        elif name in {"FETCH_DATA", "WEB_SEARCH"}:
            executed.append(
                {
                    "tag": name,
                    "ok": True,
                    "meta_only": True,
                    "note": "External data tool requested by planner; no configured provider in this backend.",
                }
            )

        elif name in {"SWITCH_AGENT", "SWITCH"}:
            requested = args.get("agent") or args.get("target") or args.get("mode")
            if not requested and args:
                requested = next(iter(args.keys()))
            target_agent = _normalize_agent_key(requested)
            executed.append(
                {
                    "tag": "SWITCH_AGENT",
                    "ok": True,
                    "meta_only": True,
                    "target_agent": target_agent,
                }
            )

        elif name == "HANGUP":
            executed.append({"tag": name, "ok": True, "meta_only": True, "args": args})

    return executed


def _get_method_and_path(event):
    method = event.get("requestContext", {}).get("http", {}).get("method", "GET")
    path = event.get("rawPath", "/")
    return method.upper(), path


def _handle_health():
    return _response(
        200,
        {
            "ok": True,
            "service": "navable-backend",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


def _handle_get_pins(event):
    params = event.get("queryStringParameters") or {}
    try:
        lat = float(params.get("lat", "22.7196"))
        lng = float(params.get("lng", "75.8577"))
        radius_m = float(params.get("radius_m", "1500"))
    except ValueError:
        return _response(400, {"ok": False, "error": "Invalid lat/lng/radius_m"})

    try:
        pins = _query_nearby_pins(lat, lng, radius_m)
    except ClientError as exc:
        return _response(500, {"ok": False, "error": f"DynamoDB scan failed: {str(exc)}"})
    return _response(200, {"ok": True, "pins": pins})


def _handle_voice_query(event):
    payload = _safe_json_loads(event.get("body"))
    query_text = payload.get("query_text", "")
    recent_hazards = payload.get("recent_hazards", [])
    history = payload.get("history", [])
    user_id = payload.get("user_id", "anonymous")
    language_hint = payload.get("language", "auto")
    active_agent = _normalize_agent_key(payload.get("active_agent", "navigator"))
    lat = payload.get("lat")
    lng = payload.get("lng")

    if not query_text:
        return _response(400, {"ok": False, "error": "query_text is required"})

    if _is_emergency_intent(query_text):
        if lat is None or lng is None:
            return _response(400, {"ok": False, "error": "lat and lng are required for emergency actions"})

        emergency_result = _trigger_sos(lat, lng, "Emergency! Immediate help requested.")
        fallback_text = "SOS triggered. Stay where you are if possible; help is being alerted."
        return _response(
            200,
            {
                "ok": True,
                "answer_text": fallback_text,
                "audio_url": None,
                "language": "auto",
                "active_agent": "safety_guardian",
                "hangup": False,
                "actions": [{"tag": "SOS_ALERT", **emergency_result}],
            },
        )

    switched_by_intent = _detect_agent_switch_intent(query_text)
    if switched_by_intent:
        active_agent = switched_by_intent

    system_prompt = _build_system_prompt(active_agent, language_hint)

    user_context = {
        "user_id": user_id,
        "location": {"lat": lat, "lng": lng},
        "recent_hazards": recent_hazards[:3],
        "history": history[-8:],
        "active_agent": active_agent,
        "user_query": query_text,
    }

    answer_text = ""
    actions = []
    hangup = False
    try:
        planner_output = _bedrock_reply(system_prompt, user_context, max_tokens=160, temperature=0.2)
        spoken_text, tags = _extract_tags(planner_output)

        if tags:
            actions = _execute_agent_tags(tags, lat, lng, recent_hazards, query_text=query_text)
            # Human synthesis prompt — Nova explains tool results warmly, not robotically
            synthesis_prompt = (
                "You are Nova, Navable's warm AI companion for visually-impaired users. "
                "Using the tool results below, give ONE warm, spoken response to the user. "
                "Mirror their language (Hindi/English/Hinglish). Max 2 short sentences. "
                "Sound like a caring friend, never a database. No bullets or tags in output."
            )
            synthesis_payload = {
                "user_query": query_text,
                "tool_results": actions,
                "draft_spoken_text": spoken_text,
                "active_agent": active_agent,
                "language_hint": language_hint,
            }
            answer_text = _bedrock_reply(synthesis_prompt, synthesis_payload, max_tokens=140, temperature=0.6)
        else:
            answer_text = spoken_text or planner_output

        switched_action = next((a for a in actions if a.get("tag") == "SWITCH_AGENT" and a.get("target_agent")), None)
        if switched_action:
            active_agent = switched_action["target_agent"]

        hangup = any(a.get("tag") == "HANGUP" for a in actions)
    except Exception:
        answer_text = "Main yahaan hoon! Abhi network thoda slow hai, lekin main aapki madad karne ke liye taiyaar hoon."

    # Detect language for TTS
    detected_lang = language_hint if language_hint in ("hi", "en") else "hi"
    audio_b64 = _call_sarvam_tts(answer_text, detected_lang)

    return _response(
        200,
        {
            "ok": True,
            "answer_text": answer_text,
            "audio_base64": audio_b64,
            "audio_url": None,
            "language": detected_lang,
            "active_agent": active_agent,
            "hangup": hangup,
            "actions": actions,
        },
    )


def _handle_sos_trigger(event):
    payload = _safe_json_loads(event.get("body"))
    lat = payload.get("lat")
    lng = payload.get("lng")
    message = payload.get("message", "Emergency! Please check my live location.")

    if lat is None or lng is None:
        return _response(400, {"ok": False, "error": "lat and lng are required"})

    return _response(200, _trigger_sos(lat, lng, message))


def _handle_voice_tts(event):
    """POST /voice/tts — calls Sarvam Bulbul v2 and returns audio_base64 WAV."""
    payload = _safe_json_loads(event.get("body"))
    text = (payload.get("text") or "").strip()
    language = (payload.get("language") or "hi").strip()
    if not text:
        return _response(400, {"ok": False, "error": "text is required"})
    audio_b64 = _call_sarvam_tts(text, language)
    return _response(200, {"ok": True, "audio_base64": audio_b64, "language": language})


def lambda_handler(event, _context):
    method, path = _get_method_and_path(event)

    if method == "OPTIONS":
        return _response(200, {"ok": True})

    if method == "GET" and path == "/health":
        return _handle_health()

    if not _is_authorized(event):
        return _response(401, {"ok": False, "error": "Unauthorized"})

    if method == "GET" and path == "/pins/nearby":
        return _handle_get_pins(event)

    if method == "POST" and path == "/voice/query":
        return _handle_voice_query(event)

    if method == "POST" and path == "/voice/tts":
        return _handle_voice_tts(event)

    if method == "POST" and path == "/sos/trigger":
        return _handle_sos_trigger(event)

    if method == "POST" and path == "/vision/detect":
        return _handle_detect_hazards(event)

    if method == "POST" and path == "/delivery/request":
        return _handle_delivery_request(event)

    return _response(404, {"ok": False, "error": f"Route not found: {method} {path}"})
