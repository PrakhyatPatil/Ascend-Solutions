import base64
import os
from typing import Any, Dict, Optional

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="navable-livekit-agent-bridge", version="1.0.0")

LAMBDA_BASE_URL = os.getenv("NAVABLE_LAMBDA_BASE_URL", "").rstrip("/")
SARVAM_STT_URL = os.getenv("SARVAM_STT_URL", "").strip()
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "").strip()
CARTESIA_TTS_URL = os.getenv("CARTESIA_TTS_URL", "").strip()
CARTESIA_API_KEY = os.getenv("CARTESIA_API_KEY", "").strip()
HTTP_TIMEOUT_S = float(os.getenv("HTTP_TIMEOUT_S", "20"))


class VoiceQueryRequest(BaseModel):
    user_id: str
    lat: float
    lng: float
    query_text: str
    recent_hazards: list[dict[str, Any]] = Field(default_factory=list)


class SttRequest(BaseModel):
    audio_b64: str
    language: Optional[str] = "auto"


class TtsRequest(BaseModel):
    text: str
    voice: Optional[str] = "default"
    language: Optional[str] = "hi-IN"


@app.get("/health")
async def health() -> Dict[str, Any]:
    return {
        "ok": True,
        "service": "navable-livekit-agent-bridge",
        "lambda_configured": bool(LAMBDA_BASE_URL),
        "sarvam_configured": bool(SARVAM_STT_URL and SARVAM_API_KEY),
        "cartesia_configured": bool(CARTESIA_TTS_URL and CARTESIA_API_KEY),
    }


@app.post("/agent/reply")
async def agent_reply(payload: VoiceQueryRequest) -> Dict[str, Any]:
    if not LAMBDA_BASE_URL:
        raise HTTPException(status_code=500, detail="NAVABLE_LAMBDA_BASE_URL is not configured")

    url = f"{LAMBDA_BASE_URL}/voice/query"
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT_S) as client:
        try:
            response = await client.post(url, json=payload.model_dump())
            response.raise_for_status()
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Lambda request failed: {exc}") from exc

    return response.json()


@app.post("/stt/sarvam")
async def stt_sarvam(payload: SttRequest) -> Dict[str, Any]:
    if not (SARVAM_STT_URL and SARVAM_API_KEY):
        raise HTTPException(status_code=500, detail="Sarvam STT is not configured")

    headers = {
        "Authorization": f"Bearer {SARVAM_API_KEY}",
        "Content-Type": "application/json",
    }

    body = {
        "audio_b64": payload.audio_b64,
        "language": payload.language,
    }

    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT_S) as client:
        try:
            response = await client.post(SARVAM_STT_URL, headers=headers, json=body)
            response.raise_for_status()
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Sarvam STT failed: {exc}") from exc

    data = response.json()
    transcript = data.get("text") or data.get("transcript") or ""
    return {"ok": True, "transcript": transcript, "raw": data}


@app.post("/tts/cartesia")
async def tts_cartesia(payload: TtsRequest) -> Dict[str, Any]:
    if not (CARTESIA_TTS_URL and CARTESIA_API_KEY):
        raise HTTPException(status_code=500, detail="Cartesia TTS is not configured")

    headers = {
        "Authorization": f"Bearer {CARTESIA_API_KEY}",
        "Content-Type": "application/json",
    }

    body = {
        "text": payload.text,
        "voice": payload.voice,
        "language": payload.language,
    }

    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT_S) as client:
        try:
            response = await client.post(CARTESIA_TTS_URL, headers=headers, json=body)
            response.raise_for_status()
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Cartesia TTS failed: {exc}") from exc

    content_type = response.headers.get("content-type", "")
    if "application/json" in content_type:
        data = response.json()
        audio_b64 = data.get("audio_b64") or data.get("audio")
        if not audio_b64:
            raise HTTPException(status_code=502, detail="Cartesia JSON response missing audio")
        return {"ok": True, "audio_b64": audio_b64, "raw": data}

    audio_b64 = base64.b64encode(response.content).decode("ascii")
    return {"ok": True, "audio_b64": audio_b64}
