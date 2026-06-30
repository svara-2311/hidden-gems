import OpenAI from "openai";

// Lazy singleton: the client is constructed on first use, not at import time.
// This matters for scripts that call dotenv.config() in their body — imports
// are evaluated before that runs, so an eager `new OpenAI()` would read an
// undefined OPENAI_API_KEY and throw.
let _client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

export async function getEmbedding(text: string): Promise<number[]> {
  const response = await getOpenAI().embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    dimensions: 1536,
  });
  return response.data[0].embedding;
}
