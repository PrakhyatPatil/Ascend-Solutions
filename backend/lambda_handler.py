import json
import math
import os
import re
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError


ddb = boto3.resource("dynamodb")
sns = boto3.client("sns")
bedrock = boto3.client("bedrock-runtime")

TABLE_NAME = os.getenv("ACCESSIBILITY_PINS_TABLE", "navable-accessibility-pins")
SOS_TOPIC_ARN = os.getenv("SOS_TOPIC_ARN", "")
BEDROCK_MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "amazon.nova-lite-v1:0")

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
    return {
        "statusCode": status_code,
        "headers": _headers(),
        "body": json.dumps(body),
    }


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


def _build_system_prompt(active_agent, language_hint="auto"):
    agent = AGENT_REGISTRY.get(active_agent, AGENT_REGISTRY["navigator"])
    return (
        f"You are Navable live call assistant in {agent['name']} mode. "
        f"Persona: {agent['persona']} "
        "Respond in maximum 2 short sentences. No bullets. Safety first. "
        f"Preferred language hint: {language_hint}. Mirror user language naturally. "
        "If live data is needed, emit only allowed action tags. "
        "Use [SWITCH:<agent_key>] for agent switching and [HANGUP] when user ends call. "
        "Allowed tags: [FETCH_PINS], [CHECK_HAZARDS], [SOS_ALERT], [FETCH_DATA], [WEB_SEARCH], [SWITCH_AGENT], [SWITCH], [HANGUP]."
    )


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


def _execute_agent_tags(tags, lat, lng, recent_hazards):
    executed = []
    for tag in tags:
        name = tag.get("name")
        args = tag.get("args", {})

        if name == "FETCH_PINS":
            radius_m = float(args.get("radius_m", 800))
            requested_filter = args.get("filter")
            try:
                pins = _query_nearby_pins(float(lat), float(lng), radius_m)
                filtered = [pin for pin in pins if _matches_pin_filter(pin, requested_filter)]
                executed.append(
                    {
                        "tag": name,
                        "ok": True,
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
            actions = _execute_agent_tags(tags, lat, lng, recent_hazards)
            synthesis_prompt = (
                "You are Navable. Create one final spoken response for the caller using tool outputs. "
                "Max 2 short sentences. No bullets. No action tags in output. "
                "Be explicit about safety if hazards are high."
            )
            synthesis_payload = {
                "user_query": query_text,
                "tool_results": actions,
                "draft_spoken_text": spoken_text,
                "active_agent": active_agent,
            }
            answer_text = _bedrock_reply(synthesis_prompt, synthesis_payload, max_tokens=140, temperature=0.2)
        else:
            answer_text = spoken_text or planner_output

        switched_action = next((a for a in actions if a.get("tag") == "SWITCH_AGENT" and a.get("target_agent")), None)
        if switched_action:
            active_agent = switched_action["target_agent"]

        hangup = any(a.get("tag") == "HANGUP" for a in actions)
    except Exception:
        # Safe fallback keeps demo flow alive if model call fails.
        answer_text = "Network is unstable right now. I can still help with SOS or nearby accessibility pins."

    return _response(
        200,
        {
            "ok": True,
            "answer_text": answer_text,
            "audio_url": None,
            "language": "auto",
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


def lambda_handler(event, _context):
    method, path = _get_method_and_path(event)

    if method == "OPTIONS":
        return _response(200, {"ok": True})

    if method == "GET" and path == "/health":
        return _handle_health()

    if method == "GET" and path == "/pins/nearby":
        return _handle_get_pins(event)

    if method == "POST" and path == "/voice/query":
        return _handle_voice_query(event)

    if method == "POST" and path == "/sos/trigger":
        return _handle_sos_trigger(event)

    return _response(404, {"ok": False, "error": f"Route not found: {method} {path}"})
