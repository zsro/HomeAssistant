import type { KeyboardEvent, MouseEvent } from 'react';

/** Suppress the second activation of a double click and held submit keys, not intentional game input. */
export function preventRepeatedClick(event: MouseEvent<HTMLElement>) {
  const target = event.target as Element;
  if (event.detail > 1 && target.closest('button') && !target.closest('.rm-minigame, [data-repeatable-input]')) {
    event.preventDefault(); event.stopPropagation();
  }
}
export function preventRepeatedKey(event: KeyboardEvent<HTMLElement>) {
  const target = event.target as Element;
  const submitting = event.key === 'Enter' && !target.matches('textarea');
  const pressingButton = event.key === ' ' && !!target.closest('button');
  if (event.repeat && (submitting || pressingButton) && !target.closest('.rm-minigame')) {
    event.preventDefault(); event.stopPropagation();
  }
}
