// Using Groq (free tier) via the OpenAI-compatible API — no extra SDK needed.
// Get a free key at https://console.groq.com
import OpenAI from "openai";

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

interface MatchBlurbParams {
  query: string;
  name: string;
  neighborhood: string;
  editorial_summary: string;
  vibe_tags: string[];
}

export async function generateMatchBlurb({
  query,
  name,
  neighborhood,
  editorial_summary,
  vibe_tags,
}: MatchBlurbParams): Promise<string> {
  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    max_tokens: 200,
    messages: [
      {
        role: "system",
        content: `You are a sharp, opinionated SF local who knows every coffee shop in the city. Be specific. Never say "great ambiance" or "cozy atmosphere". Write like you've actually been there.`,
      },
      {
        role: "user",
        content: `A user searched for: '${query}'
This place came up: ${name} in ${neighborhood}.
About it: ${editorial_summary}
Vibe tags: ${vibe_tags.join(", ")}
In 2 sentences, explain specifically why this place matches their search. Start with the place name.`,
      },
    ],
  });

  return response.choices[0].message.content ?? `${name} is worth checking out for this vibe.`;
}
