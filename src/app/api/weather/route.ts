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

  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Weather API not configured" }, { status: 500 });
  }

  // Check cache
  const cacheKey = `${parseFloat(lat).toFixed(2)},${parseFloat(lon).toFixed(2)}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.time < WEATHER_CACHE_TTL) {
    return Response.json(cached.data);
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather API: ${res.status}`);

    const data = await res.json();
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
