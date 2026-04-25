import json
import math
import os
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError


ddb = boto3.resource("dynamodb")
sns = boto3.client("sns")
bedrock = boto3.client("bedrock-runtime")

TABLE_NAME = os.getenv("ACCESSIBILITY_PINS_TABLE", "navable-accessibility-pins")
SOS_TOPIC_ARN = os.getenv("SOS_TOPIC_ARN", "")
BEDROCK_MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "amazon.nova-lite-v1:0")


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

    table = ddb.Table(TABLE_NAME)
    try:
        result = table.scan()
        items = result.get("Items", [])
    except ClientError as exc:
        return _response(500, {"ok": False, "error": f"DynamoDB scan failed: {str(exc)}"})

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
    return _response(200, {"ok": True, "pins": pins[:25]})


def _handle_voice_query(event):
    payload = _safe_json_loads(event.get("body"))
    query_text = payload.get("query_text", "")
    recent_hazards = payload.get("recent_hazards", [])
    lat = payload.get("lat")
    lng = payload.get("lng")

    if not query_text:
        return _response(400, {"ok": False, "error": "query_text is required"})

    system_prompt = (
        "You are Navable, a live accessibility navigation assistant for India. "
        "Respond in 1-2 concise sentences. Prioritize safety. "
        "If user speaks Hindi, reply in Hindi; otherwise English."
    )

    user_context = {
        "location": {"lat": lat, "lng": lng},
        "recent_hazards": recent_hazards[:3],
        "user_query": query_text,
    }

    answer_text = ""
    try:
        response = bedrock.converse(
            modelId=BEDROCK_MODEL_ID,
            system=[{"text": system_prompt}],
            messages=[
                {
                    "role": "user",
                    "content": [{"text": json.dumps(user_context, ensure_ascii=False)}],
                }
            ],
            inferenceConfig={"maxTokens": 120, "temperature": 0.2},
        )
        output = response.get("output", {}).get("message", {}).get("content", [])
        for chunk in output:
            if "text" in chunk:
                answer_text += chunk["text"]
        answer_text = answer_text.strip()
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
        },
    )


def _handle_sos_trigger(event):
    payload = _safe_json_loads(event.get("body"))
    lat = payload.get("lat")
    lng = payload.get("lng")
    message = payload.get("message", "Emergency! Please check my live location.")

    if lat is None or lng is None:
        return _response(400, {"ok": False, "error": "lat and lng are required"})

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

    return _response(
        200,
        {
            "ok": True,
            "sent": sent,
            "tracking_url": maps_url,
            "error": publish_error,
            "mode": mode,
        },
    )


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
