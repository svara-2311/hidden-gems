import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
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
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 200,
    system: `You are a sharp, opinionated SF local who knows every coffee shop in the city. Be specific. Never say "great ambiance" or "cozy atmosphere". Write like you've actually been there.`,
    messages: [
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

  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected Anthropic response type");
  return block.text;
}
