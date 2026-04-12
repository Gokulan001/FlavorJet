import { NextRequest } from "next/server";

// ── Weather Cache (30 min per location) ──────────────────────────────────────
const weatherCache = new Map<string, { data: unknown; time: number }>();
const WEATHER_CACHE_TTL = 30 * 60 * 1000;

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lon = req.nextUrl.searchParams.get("lon");

  if (!lat || !lon) {
    return Response.json({ error: "lat and lon required" }, { status: 400 });
  }

  // Validate lat/lon are valid numbers in range
  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);
  if (isNaN(latNum) || isNaN(lonNum) || latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
    return Response.json({ error: "Invalid lat/lon values" }, { status: 400 });
  }

  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Weather API not configured" }, { status: 503 });
  }

  // Check cache
  const cacheKey = `${parseFloat(lat).toFixed(2)},${parseFloat(lon).toFixed(2)}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.time < WEATHER_CACHE_TTL) {
    return Response.json(cached.data);
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });

    if (!res.ok) {
      if (res.status === 401) return Response.json({ error: "Weather API misconfigured" }, { status: 503 });
      if (res.status === 429) return Response.json({ error: "Rate limited" }, { status: 429, headers: { "Retry-After": "60" } });
      throw new Error(`Weather API: ${res.status}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any;
    try { data = await res.json(); } catch { return Response.json({ error: "Invalid weather response" }, { status: 502 }); }
    const weather = {
      temp: Math.round(data.main.temp),
      feels_like: Math.round(data.main.feels_like),
      description: data.weather?.[0]?.description || "clear",
      humidity: data.main.humidity,
      icon: data.weather?.[0]?.icon || "01d",
    };

    weatherCache.set(cacheKey, { data: weather, time: Date.now() });
    return Response.json(weather);
  } catch (error) {
    console.error("[Weather API] Error:", error);
    return Response.json({ error: "Failed to fetch weather" }, { status: 500 });
  }
}
