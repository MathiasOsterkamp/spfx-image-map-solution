import * as React from 'react';

const FOCUSABLE = 'button:not([disabled]), a[href], [role="button"]:not([aria-disabled="true"]), .ms-Link';

/**
 * Pfeiltasten-Navigation innerhalb eines Containers (ARIA-Toolbar-/Listen-Muster), ohne FocusZone.
 * horizontal: links/rechts, vertical: hoch/runter. Pos1/Ende springen an Anfang/Ende.
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

/** Setzt beim ersten Rendern nur das erste Element in die Tab-Reihenfolge (ein Tab-Stopp). */
export function initRovingTabIndex(container: HTMLElement | null): void {
  if (!container) { return; }
  const all = Array.prototype.slice.call(container.querySelectorAll(FOCUSABLE)) as HTMLElement[];
  if (all.some((el: HTMLElement) => el.getAttribute('tabindex') === '0' && el === document.activeElement)) { return; }
  all.forEach((el: HTMLElement, i: number) => el.setAttribute('tabindex', i === 0 ? '0' : '-1'));
}
