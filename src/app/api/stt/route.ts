// Server-side proxy for ElevenLabs Speech-to-Text
// Keeps API key on server, never exposed to client

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "STT not configured" }, { status: 503 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as Blob | null;
    const language = (formData.get("language") as string) || "en";

    if (!file) {
      return Response.json({ error: "No audio file" }, { status: 400 });
    }

    // Forward to ElevenLabs
    const elevenFormData = new FormData();
    elevenFormData.append("file", file, "recording.webm");
    elevenFormData.append("model_id", "scribe_v1");
    elevenFormData.append("language", language.split("-")[0]);

    const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: elevenFormData,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[STT] ElevenLabs error:", res.status, errText);
      return Response.json({ error: "STT failed" }, { status: 502 });
    }

    const result = await res.json();
    return Response.json({ text: result.text || "" });
  } catch (error) {
    console.error("[STT] Error:", error);
    return Response.json({ error: "STT error" }, { status: 500 });
  }
}
