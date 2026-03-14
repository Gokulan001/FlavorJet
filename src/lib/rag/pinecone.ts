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

export const searchSimilar = async (
  queryVector: number[],
  topK: number = 5
) => {
  const response = await namespace.query({
    vector: queryVector,
    topK,
    includeMetadata: true,
  });
  
  return response.matches.map((match) => ({
    id: match.id,
    score: match.score,
    metadata: match.metadata,
  }));
};
