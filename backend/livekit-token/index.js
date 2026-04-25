import { AccessToken } from 'livekit-server-sdk';

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'OPTIONS,POST',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}

function methodOf(event) {
  return event?.requestContext?.http?.method || event?.httpMethod || 'POST';
}

export const handler = async (event) => {
  const method = methodOf(event).toUpperCase();

  if (method === 'OPTIONS') {
    return response(200, { ok: true });
  }

  try {
    const body = event?.body ? JSON.parse(event.body) : {};
    const roomName = String(body.roomName || '').trim();
    const participantName = String(body.participantName || 'guest').trim();
    const canPublish = body.canPublish !== false;
    const canSubscribe = body.canSubscribe !== false;

    if (!roomName) {
      return response(400, { ok: false, error: 'roomName is required' });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret) {
      return response(500, { ok: false, error: 'Missing LIVEKIT_API_KEY or LIVEKIT_API_SECRET' });
    }

    const identitySuffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const safeName = participantName || 'guest';
    const identity = `${safeName}-${identitySuffix}`;

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: safeName,
      ttl: body.ttl || '10m',
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish,
      canSubscribe,
    });

    const token = await at.toJwt();

    return response(200, {
      ok: true,
      token,
      identity,
      roomName,
    });
  } catch (error) {
    console.error('livekit-token error', error);
    return response(500, { ok: false, error: 'Failed to generate token' });
  }
};
