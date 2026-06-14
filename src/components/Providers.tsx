'use client';

import { MotionConfig } from 'framer-motion';
import { useSettings } from '@/store/settingsStore';

/**
 * App-wide client providers. Centralizes motion preferences so
 * `prefers-reduced-motion` (or the user's explicit override in Settings) is
 * honored by every Framer Motion animation at once.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const motion = useSettings((s) => s.motion);
  const reducedMotion = motion === 'off' ? 'always' : motion === 'on' ? 'never' : 'user';

  return <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>;
}
