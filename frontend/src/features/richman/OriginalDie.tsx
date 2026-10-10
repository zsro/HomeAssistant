import { useState } from 'react';

const symbols = ['·', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export function OriginalDie({ value }: { value: number }) {
  const [failed, setFailed] = useState(false);
  if (failed || value < 1 || value > 6 || !Number.isInteger(value)) return <>{symbols[value] ?? value}</>;
  return <img src={`/richman/generated/dice-${value}.webp`} alt="" onError={() => setFailed(true)} />;
}
