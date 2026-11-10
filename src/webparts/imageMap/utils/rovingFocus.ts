import * as React from 'react';

const FOCUSABLE = 'button:not([disabled]), a[href], [role="button"]:not([aria-disabled="true"]), .ms-Link';

/**
 * Arrow key navigation within a container (ARIA toolbar/list pattern), without FocusZone.
 * horizontal: left/right, vertical: up/down. Home/End jump to start/end.
 */
export function handleRovingKeyDown(e: React.KeyboardEvent<HTMLElement>, orientation: 'horizontal' | 'vertical'): void {
  const prevKeys = orientation === 'horizontal' ? ['ArrowLeft', 'Left'] : ['ArrowUp', 'Up'];
  const nextKeys = orientation === 'horizontal' ? ['ArrowRight', 'Right'] : ['ArrowDown', 'Down'];
  const all = Array.prototype.slice.call(e.currentTarget.querySelectorAll(FOCUSABLE)) as HTMLElement[];
  if (!all.length) { return; }
  const index = all.indexOf(document.activeElement as HTMLElement);
  let target = -1;
  if (prevKeys.indexOf(e.key) >= 0) { target = index <= 0 ? all.length - 1 : index - 1; }
  else if (nextKeys.indexOf(e.key) >= 0) { target = index >= all.length - 1 ? 0 : index + 1; }
  else if (e.key === 'Home') { target = 0; }
  else if (e.key === 'End') { target = all.length - 1; }
  if (target >= 0) {
    e.preventDefault();
    e.stopPropagation();
    all.forEach((el: HTMLElement, i: number) => el.setAttribute('tabindex', i === target ? '0' : '-1'));
    all[target].focus();
  }
}

/** On first render, puts only the first element into the tab order (one tab stop). */
export function initRovingTabIndex(container: HTMLElement | null): void {
  if (!container) { return; }
  const all = Array.prototype.slice.call(container.querySelectorAll(FOCUSABLE)) as HTMLElement[];
  if (all.some((el: HTMLElement) => el.getAttribute('tabindex') === '0' && el === document.activeElement)) { return; }
  all.forEach((el: HTMLElement, i: number) => el.setAttribute('tabindex', i === 0 ? '0' : '-1'));
}
