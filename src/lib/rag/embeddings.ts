import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

// ── In-memory embedding cache ───────────────────────────────────────────────
// Avoids redundant Gemini API calls for repeated queries ("popular", "burger", etc.)
// ~6KB per entry (768 floats) × 200 max = ~1.2MB memory ceiling
const embeddingCache = new Map<string, { vector: number[]; ts: number }>();
const EMB_TTL = 60 * 60 * 1000; // 1 hour
const EMB_MAX = 200;

export const embedText = async (text: string): Promise<number[]> => {
  const key = text.toLowerCase().trim();

  // Check cache
  const cached = embeddingCache.get(key);
  if (cached && Date.now() - cached.ts < EMB_TTL) {
    console.log(`[Embedding] cache HIT: "${key.slice(0, 40)}"`);
    return cached.vector;
  }

  const response = await client.models.embedContent({
    model: "gemini-embedding-001",
    contents: [text],
    config: {
      outputDimensionality: 768,
      taskType: "RETRIEVAL_QUERY"
    }
  });

  if (!response.embeddings || response.embeddings.length === 0) {
    throw new Error("Embedding failed");
  }

  const vector = response.embeddings[0].values!;

  // Evict oldest entry if at capacity
  if (embeddingCache.size >= EMB_MAX) {
    let oldestKey = "";
    let oldestTs = Infinity;
    for (const [k, v] of embeddingCache) {
      if (v.ts < oldestTs) { oldestTs = v.ts; oldestKey = k; }
    }
    if (oldestKey) embeddingCache.delete(oldestKey);
  }

  embeddingCache.set(key, { vector, ts: Date.now() });
  console.log(`[Embedding] cache MISS → stored: "${key.slice(0, 40)}" (${embeddingCache.size}/${EMB_MAX})`);

  return vector;
};

export const embedBatch = async (texts: string[]): Promise<number[][]> => {
  const response = await client.models.embedContent({
    model: "gemini-embedding-001",
    contents: texts,
    config: { 
      outputDimensionality: 768,
      taskType: "RETRIEVAL_QUERY"
    }
  });

  return response.embeddings!.map(e => e.values!);
};