// Server-side proxy for ElevenLabs Text-to-Speech
// Keeps API key on server, never exposed to client

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "TTS not configured" }), { status: 503 });
    }

    const { text, language } = (await req.json()) as { text: string; language?: string };
    if (!text?.trim()) {
      return new Response(JSON.stringify({ error: "No text provided" }), { status: 400 });
    }

    const voiceId = process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL"; // Sarah

    const wasTruncated = text.length > 500;

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text.slice(0, 500),
        model_id: "eleven_turbo_v2_5",
        language_code: language || "en",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[TTS] ElevenLabs error:", res.status, errText);
      if (res.status === 401) return new Response(JSON.stringify({ error: "TTS service misconfigured" }), { status: 503 });
      if (res.status === 429) return new Response(JSON.stringify({ error: "TTS rate limited" }), { status: 429, headers: { "Retry-After": "60" } });
      return new Response(JSON.stringify({ error: "TTS failed" }), { status: 502 });
    }

    const audioBuffer = await res.arrayBuffer();
    const headers: Record<string, string> = {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    };
    if (wasTruncated) headers["X-Text-Truncated"] = "true";

    return new Response(audioBuffer, { headers });
  } catch (error) {
    console.error("[TTS] Error:", error);
    return new Response(JSON.stringify({ error: "TTS error" }), { status: 500 });
  }
}
