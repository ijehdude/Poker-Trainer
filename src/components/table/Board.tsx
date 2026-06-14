'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { Card } from '@/engine/types';
import { PlayingCard } from './PlayingCard';

/**
 * The community board. Cards deal in with a staggered slide+flip as each
 * street arrives. Winning cards can be highlighted at showdown.
 */
export function Board({
  cards,
  size = 'md',
  highlightSet,
}: {
  cards: readonly Card[];
  size?: 'sm' | 'md' | 'lg';
  highlightSet?: Set<string>;
}) {
  const ph =
    size === 'lg'
      ? 'h-24 w-16 rounded-lg'
      : size === 'sm'
        ? 'h-[3.25rem] w-9 rounded-md'
        : 'h-[4.4rem] w-12 rounded-md';
  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
      <AnimatePresence initial={false}>
        {cards.map((card, i) => {
          const key = `${card.rank}${card.suit}`;
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: -28, rotateZ: -8, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, rotateZ: 0, scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 320,
                damping: 24,
                delay: Math.min(i, 4) * 0.06,
              }}
            >
              <PlayingCard card={card} size={size} highlight={highlightSet?.has(key)} />
            </motion.div>
          );
        })}
      </AnimatePresence>
      {/* Placeholders for undealt board slots keep the layout stable. */}
      {Array.from({ length: Math.max(0, 5 - cards.length) }).map((_, i) => (
        <div
          key={`ph-${i}`}
          className={`${ph} border-felt-light/30 border-2 border-dashed bg-black/10`}
          aria-hidden
        />
      ))}
    </div>
  );
}
