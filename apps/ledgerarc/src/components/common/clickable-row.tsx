import type * as React from 'react';

/** Props that make a table row keyboard-operable (Enter / Space) as well as clickable. */
export function clickableRowProps(
  onActivate: () => void,
  label: string,
): React.HTMLAttributes<HTMLTableRowElement> {
  return {
    role: 'button',
    tabIndex: 0,
    'aria-label': label,
    className:
      'cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
    onClick: onActivate,
    onKeyDown: (event) => {
      if (event.target !== event.currentTarget) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onActivate();
      }
    },
  };
}
