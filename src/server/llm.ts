/**
 * Server-only LLM provider abstraction.
 *
 * The Cloud coach route talks to an `LLMProvider`. DeepSeek is the default
 * implementation (OpenAI-compatible chat-completions API), but any provider
 * can be dropped in behind this interface without touching the route or the
 * client. The API key is read from the environment and NEVER sent to the
 * browser — this module must only be imported from server code.
 */

import 'server-only';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMProvider {
  readonly name: string;
  /** Returns the assistant's reply text. Throws on transport/API errors. */
  complete(
    messages: LLMMessage[],
    opts?: { maxTokens?: number; temperature?: number },
  ): Promise<string>;
}

/** True when a cloud key is configured. The route uses this to fall back. */
export function isCloudConfigured(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

class DeepSeekProvider implements LLMProvider {
  readonly name = 'deepseek';
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY ?? '';
    this.baseUrl = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
    this.model = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';
  }

  async complete(
    messages: LLMMessage[],
    opts: { maxTokens?: number; temperature?: number } = {},
  ): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: opts.maxTokens ?? 400,
        temperature: opts.temperature ?? 0.6,
        stream: false,
      }),
      // Don't let a slow upstream hang the serverless function indefinitely.
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`DeepSeek API ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('DeepSeek returned an empty completion');
    return content;
  }
}

/** Factory — returns the configured provider, or null if no key is set. */
export function getLLMProvider(): LLMProvider | null {
  if (!isCloudConfigured()) return null;
  return new DeepSeekProvider();
}
