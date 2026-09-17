export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export function aiConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): AiConfig | null {
  const apiKey = env.ACE_AI_API_KEY;
  if (!apiKey) return null;
  return {
    baseUrl: (env.ACE_AI_BASE_URL || 'https://api.openai.com/v1').replace(
      /\/$/,
      '',
    ),
    apiKey,
    model: env.ACE_AI_MODEL || 'gpt-4o-mini',
  };
}

export async function runAiReview(
  prompt: string,
  config: AiConfig,
): Promise<string> {
  const url = `${config.baseUrl}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'system',
          content:
            'You are a senior engineering reviewer. Follow the prompt exactly and return a complete Markdown report.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `AI provider error (${res.status}): ${text.slice(0, 300)}`,
    );
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? '';
}
