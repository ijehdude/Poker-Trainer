/**
 * Cloud coach (DeepSeek) — client side.
 *
 * Talks ONLY to our own server route (`/api/coach`), which holds the API
 * key. Every method falls back to the Offline coach if the network fails,
 * the server reports no key configured, or anything else goes wrong — so
 * the app is always fully functional with zero keys.
 */

import type { CoachProvider, CoachInput, CoachFeedback, ChatMessage } from './types';
import { offlineCoach, explainOffline } from './offline';

async function postCoach<T>(body: unknown): Promise<T | null> {
  try {
    const res = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const cloudCoach: CoachProvider = {
  id: 'cloud',
  label: 'Cloud (DeepSeek)',

  async explain(input: CoachInput): Promise<CoachFeedback> {
    const data = await postCoach<{ text?: string; error?: string }>({
      kind: 'explain',
      input,
    });
    if (!data || data.error || !data.text) {
      // Fall back to the offline explanation but keep the structure.
      return explainOffline(input);
    }
    // The cloud returns prose; split into a headline + supporting lines.
    const lines = data.text
      .split('\n')
      .map((l) => l.replace(/^[-*•]\s*/, '').trim())
      .filter(Boolean);
    const headline = lines[0] ?? explainOffline(input).headline;
    return {
      headline,
      detail: lines.slice(1).length ? lines.slice(1) : explainOffline(input).detail,
      concept: explainOffline(input).concept,
      source: 'cloud',
    };
  },

  async chat(messages: ChatMessage[], context?: CoachInput): Promise<string> {
    const data = await postCoach<{ text?: string; error?: string }>({
      kind: 'chat',
      messages,
      context,
    });
    if (!data || data.error || !data.text) {
      return offlineCoach.chat(messages, context);
    }
    return data.text;
  },
};
