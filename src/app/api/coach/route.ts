/**
 * Cloud coach route handler (server-side).
 *
 * Proxies the optional DeepSeek-powered coach. The API key lives ONLY here
 * (via `DEEPSEEK_API_KEY`) and is never exposed to the client. If no key is
 * configured or the upstream fails, we return `{ error }` so the client
 * transparently falls back to the Offline coach — the app stays fully
 * functional with zero environment variables.
 */

import { NextResponse } from 'next/server';
import { getLLMProvider, type LLMMessage } from '@/server/llm';
import type { CoachInput, ChatMessage } from '@/coach/types';

export const runtime = 'nodejs';
// Never cache coaching responses.
export const dynamic = 'force-dynamic';

interface ExplainBody {
  kind: 'explain';
  input: CoachInput;
}
interface ChatBody {
  kind: 'chat';
  messages: ChatMessage[];
  context?: CoachInput;
}
type Body = ExplainBody | ChatBody;

const SYSTEM_PROMPT = `You are an elite No-Limit Texas Hold'em coach. You are precise, encouraging, and concrete. Always reference the actual numbers you're given (equity, pot odds, EV, position, board texture). Use plain language a developing player understands. Never invent facts beyond the data provided. Keep answers tight.`;

export async function POST(req: Request) {
  const provider = getLLMProvider();
  if (!provider) {
    // No key configured — signal the client to use the offline coach.
    return NextResponse.json({ error: 'cloud-not-configured' }, { status: 200 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
  }

  try {
    if (body.kind === 'explain') {
      const messages: LLMMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: explainPrompt(body.input),
        },
      ];
      const text = await provider.complete(messages, { maxTokens: 320, temperature: 0.5 });
      return NextResponse.json({ text });
    }

    if (body.kind === 'chat') {
      const history = (body.messages ?? [])
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 1500) }) as LLMMessage);
      const messages: LLMMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...(body.context
          ? [{ role: 'system' as const, content: `Current spot:\n${describeSpot(body.context)}` }]
          : []),
        ...history,
      ];
      const text = await provider.complete(messages, { maxTokens: 400, temperature: 0.7 });
      return NextResponse.json({ text });
    }

    return NextResponse.json({ error: 'unknown-kind' }, { status: 400 });
  } catch (err) {
    // Upstream/transport failure → client falls back to offline.
    const message = err instanceof Error ? err.message : 'cloud-error';
    return NextResponse.json({ error: message }, { status: 200 });
  }
}

function describeSpot(i: CoachInput): string {
  const lines = [
    `Street: ${i.street}`,
    `Hero: ${i.holeCards.join(' ')} (${i.handClass}) in the ${i.position}`,
    i.board.length
      ? `Board: ${i.board.join(' ')} — ${i.boardTexture.descriptor}`
      : 'Board: preflop',
    `Pot: ${i.pot} | To call: ${i.toCall} | Pot odds: ${i.potOdds}`,
    `Equity: ${(i.equity * 100).toFixed(1)}% | Break-even needed: ${(i.breakEven * 100).toFixed(1)}%`,
    `Hero did: ${i.action.type}${i.action.amount ? ' ' + i.action.amount : ''}`,
    `Solver's best: ${i.recommended.type}${i.recommended.amount ? ' ' + i.recommended.amount : ''}`,
    `Verdict: ${i.verdict} (EV lost ${i.evLossBB.toFixed(2)}bb)`,
  ];
  return lines.join('\n');
}

function explainPrompt(i: CoachInput): string {
  return `Here is a single poker decision to review:

${describeSpot(i)}

Write feedback for the player:
- First line: a short, punchy headline summarizing the decision (no bullet marker).
- Then 2–4 short bullet points (start each with "- ") explaining WHY, citing the pot odds vs equity, position, board texture, and the EV difference between what they did and the solver's best line.
Keep it under 90 words total.`;
}
