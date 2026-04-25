# Navable LiveKit on EC2 (with Lambda + Bedrock Nova Lite)

This setup keeps media on EC2 and intelligence on Lambda.

## Architecture
1. Navable app joins LiveKit room (EC2) using token from `backend/livekit-token` Lambda.
2. Voice/text query goes to existing Navable Lambda (`/voice/query`) which uses Bedrock Nova Lite.
3. Agent bridge on EC2 calls:
- Sarvam STT endpoint
- Navable Lambda `/voice/query`
- Cartesia TTS endpoint

## Files Added
- `infra/livekit-ec2/docker-compose.yml`
- `infra/livekit-ec2/livekit.yaml.example`
- `infra/livekit-ec2/.env.example`
- `infra/livekit-ec2/bootstrap-ubuntu.sh`
- `infra/livekit-ec2/deploy-on-ec2.sh`
- `backend/livekit-token/index.js`
- `backend/livekit-token/package.json`
- `backend/livekit-agent-bridge/app.py`

## EC2 Setup
1. Launch Ubuntu EC2 (recommended `t3.small` or above).
2. Open security group:
- TCP 22
- TCP 7880
- TCP 7881
- UDP 50000-50100
- TCP 8080 (optional, for bridge API health)
3. Clone repo on EC2.
4. Run:
```bash
cd Ascend-Solutions/infra/livekit-ec2
bash bootstrap-ubuntu.sh
cp livekit.yaml.example livekit.yaml
cp .env.example .env
```

## Configure Secrets
Edit `infra/livekit-ec2/livekit.yaml`:
- set key + secret

Edit `infra/livekit-ec2/.env`:
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `NAVABLE_LAMBDA_BASE_URL`
- `SARVAM_STT_URL`
- `SARVAM_API_KEY`
- `CARTESIA_TTS_URL`
- `CARTESIA_API_KEY`

## Start Stack on EC2
```bash
cd Ascend-Solutions/infra/livekit-ec2
bash deploy-on-ec2.sh
docker ps
curl http://localhost:8080/health
```

## LiveKit Token Lambda
Deploy `backend/livekit-token` as Lambda (`Node.js 20.x`) and set env:
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

Expose endpoint through Function URL or API Gateway.

## RN App Integration (next wiring)
1. App requests token from token Lambda.
2. App joins room using `LIVEKIT_WS_URL`.
3. App sends mic stream and receives synthesized audio.

## Notes
- LiveKit server is on EC2 as requested.
- Bedrock Nova Lite remains in Lambda backend.
- Bridge service is deploy-ready but provider payload formats may need tiny mapping adjustments depending on your exact Sarvam/Cartesia API plan.
