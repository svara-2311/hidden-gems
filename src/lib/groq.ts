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
    // llama-3.1-8b-instant was retired from Groq's catalog; qwen3.8-27b is the
    // current fast/cheap option that answers directly (no chain-of-thought
    // eating the token budget the way the gpt-oss models do).
    model: "qwen/qwen3.8-27b",
    max_tokens: 60,
    messages: [
      {
        role: "system",
        content: `You are an enthusiastic SF local recommending coffee shops you genuinely like. This is a recommendation, not a review: always write positively. Never criticize the place, question whether it belongs on the list, or call it a bad match.

You are given exactly two sources of truth about the place: its editorial summary and its vibe tags. Every concrete claim you make — a drink, a dish, a decor detail, an amenity, an event, a history — must be directly stated in, or a very close paraphrase of, those two sources. Never invent a specific detail that isn't there. If the source material is thin, write a shorter or more general sentence instead of inventing specifics to sound vivid. Avoid generic filler too ("great ambiance", "cozy atmosphere") — ground the sentence in what's actually given, even if that means being simple rather than colorful.

Write as if talking directly to someone who wants what they described — don't refer to "the search", "this query", or "your dedicated search"; just describe why the place fits what they're after.`,
      },
      {
        role: "user",
        content: `Someone wants: '${query}'
This place: ${name} in ${neighborhood}.
Editorial summary: ${editorial_summary}
Vibe tags: ${vibe_tags.join(", ")}

In exactly one sentence (20 words or fewer), using only facts from the summary and tags above, say why this place fits what they want. Start with the place name.`,
      },
    ],
  });

  return response.choices[0].message.content ?? `${name} is worth checking out for this vibe.`;
}
