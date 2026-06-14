'use client';

import { useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { getCoach, type CoachInput, type ChatMessage } from '@/coach';
import { useSettings } from '@/store/settingsStore';
import { cn } from '@/lib/cn';

const SUGGESTIONS = ['Why?', 'What are my pot odds?', 'How does position matter here?'];

/**
 * Ask-the-coach box. Works offline (heuristic answers) and gets much
 * richer when Cloud (DeepSeek) is enabled. Always usable with no key.
 */
export function CoachChat({ context }: { context?: CoachInput }) {
  const { coachMode } = useSettings();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: q }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const answer = await getCoach(coachMode).chat(next, context);
      setMessages([...next, { role: 'assistant', content: answer }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel className="flex flex-col p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="px-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Ask the coach
        </span>
        <span className="text-[10px] text-ink-muted">
          {coachMode === 'cloud' ? 'DeepSeek' : 'Offline'}
        </span>
      </div>

      {messages.length > 0 && (
        <div className="mb-2 max-h-52 space-y-2 overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                'rounded-lg px-3 py-2 text-xs leading-relaxed',
                m.role === 'user'
                  ? 'bg-accent/15 ml-6 text-ink'
                  : 'mr-6 bg-panel-raised text-ink-secondary',
              )}
            >
              {m.content}
            </div>
          ))}
          {busy && (
            <div className="mr-6 rounded-lg bg-panel-raised px-3 py-2 text-xs text-ink-muted">
              …
            </div>
          )}
        </div>
      )}

      {messages.length === 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="hover:border-accent/40 rounded-full border border-panel-border px-2.5 py-1 text-[11px] text-ink-secondary transition-colors hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this spot…"
          className="focus:border-accent/50 min-w-0 flex-1 rounded-md border border-panel-border bg-panel-raised px-3 py-2 text-xs text-ink outline-none placeholder:text-ink-muted"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-md bg-accent px-3 py-2 text-xs font-semibold text-ink-inverse disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </Panel>
  );
}
