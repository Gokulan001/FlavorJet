import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

export const embedText = async (text: string): Promise<number[]> => {
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

  return response.embeddings[0].values!; 
};

export const embedBatch = async (texts: string[]): Promise<number[][]> => {
  const response = await client.models.embedContent({
    model: "gemini-embedding-001",
    contents: texts,
    config: { 
      outputDimensionality: 768,
      taskType: "RETRIEVAL_DOCUMENT"
    }
  });

  return response.embeddings!.map(e => e.values!);
};