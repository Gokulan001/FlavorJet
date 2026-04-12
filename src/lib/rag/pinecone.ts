import { Pinecone, RecordMetadata } from "@pinecone-database/pinecone";

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const index = pc.index({ name: process.env.PINECONE_INDEX_NAME! });
const namespace = index.namespace("menu-items");

export const upsertVectors = async (
  records: Array<{ id: string; values: number[]; metadata: RecordMetadata }>
) => {
  await namespace.upsert({ records });
};

// ── In-memory Pinecone results cache ────────────────────────────────────────
// Same embedding vector → same Pinecone matches. Short TTL keeps results fresh.
interface PineconeMatch { id: string; score: number | undefined; metadata: RecordMetadata | undefined }
const pineconeCache = new Map<string, { matches: PineconeMatch[]; ts: number }>();
const PC_TTL = 5 * 60 * 1000; // 5 minutes
const PC_MAX = 100;

/** Hash first 8 floats + topK as cache key (fast, low collision for our use case) */
function vectorKey(v: number[], topK: number): string {
  return `${v.slice(0, 8).map(n => n.toFixed(4)).join(",")}:${topK}`;
}

export const searchSimilar = async (
  queryVector: number[],
  topK: number = 5
) => {
  const key = vectorKey(queryVector, topK);

  const cached = pineconeCache.get(key);
  if (cached && Date.now() - cached.ts < PC_TTL) {
    console.log(`[Pinecone] cache HIT (${cached.matches.length} matches)`);
    return cached.matches;
  }

  const response = await namespace.query({
    vector: queryVector,
    topK,
    includeMetadata: true,
  });

  const matches = response.matches.map((match) => ({
    id: match.id,
    score: match.score,
    metadata: match.metadata,
  }));

  // Evict oldest if at capacity
  if (pineconeCache.size >= PC_MAX) {
    let oldestKey = "";
    let oldestTs = Infinity;
    for (const [k, v] of pineconeCache) {
      if (v.ts < oldestTs) { oldestTs = v.ts; oldestKey = k; }
    }
    if (oldestKey) pineconeCache.delete(oldestKey);
  }

  pineconeCache.set(key, { matches, ts: Date.now() });
  console.log(`[Pinecone] cache MISS → stored (${matches.length} matches, ${pineconeCache.size}/${PC_MAX})`);

  return matches;
};
