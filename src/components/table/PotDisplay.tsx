'use client';

import { motion } from 'framer-motion';
import { ChipStack, formatAmount } from './Chip';

export function PotDisplay({ amount, bigBlind }: { amount: number; bigBlind: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-2 rounded-full border border-panel-border bg-black/40 px-3 py-1 backdrop-blur">
        <span className="text-[10px] font-medium uppercase tracking-widest text-ink-muted">
          Pot
        </span>
        <motion.span
          key={amount}
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          className="nums font-display text-base font-bold text-accent-gold"
        >
          {formatAmount(amount)}
        </motion.span>
        {bigBlind > 0 && (
          <span className="nums text-[10px] text-ink-muted">
            {(amount / bigBlind).toFixed(1)}bb
          </span>
        )}
      </div>
      {amount > 0 && <ChipStack amount={amount} size={18} animateKey={Math.round(amount)} />}
    </div>
  );
}
