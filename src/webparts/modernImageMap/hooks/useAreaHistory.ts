import * as React from 'react';
import * as strings from 'ModernImageMapWebPartStrings';
import { formatText } from '../loc/template';
import { IImageArea } from '../models/IImageMap';

interface IHistoryEntry {
  areas: IImageArea[];
  label: string;
}

export interface IAreaHistory {
  /**
   * Applies a new state and remembers the old one for "undo".
   * The same coalesceKey within a short time (e.g. typing, arrow keys) results in ONE step.
   */
  commit: (next: IImageArea[], label: string, coalesceKey?: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel?: string;
  redoLabel?: string;
}

const MAX_STEPS = 50;
const COALESCE_MS = 1500;

export function useAreaHistory(
  getCurrent: () => IImageArea[],
  apply: (areas: IImageArea[]) => void,
  announce: (message: string) => void
): IAreaHistory {
  const past = React.useRef<IHistoryEntry[]>([]);
  const future = React.useRef<IHistoryEntry[]>([]);
  const last = React.useRef<{ key?: string; time: number }>({ time: 0 });
  const [, setVersion] = React.useState<number>(0);
  const bump = () => setVersion((v: number) => v + 1);

  const commit = (next: IImageArea[], label: string, coalesceKey?: string) => {
    const now = Date.now();
    const coalesce = !!coalesceKey && last.current.key === coalesceKey && now - last.current.time < COALESCE_MS;
    if (!coalesce) {
      past.current.push({ areas: getCurrent(), label });
      if (past.current.length > MAX_STEPS) { past.current.shift(); }
    }
    future.current = [];
    last.current = { key: coalesceKey, time: now };
    apply(next);
    bump();
  };

  const undo = () => {
    const entry = past.current.pop();
    if (!entry) { announce(strings.nothingToUndo); return; }
    future.current.push({ areas: getCurrent(), label: entry.label });
    last.current = { time: 0 };
    apply(entry.areas);
    announce(formatText(strings.undone, entry.label));
    bump();
  };

  const redo = () => {
    const entry = future.current.pop();
    if (!entry) { announce(strings.nothingToRedo); return; }
    past.current.push({ areas: getCurrent(), label: entry.label });
    last.current = { time: 0 };
    apply(entry.areas);
    announce(formatText(strings.redone, entry.label));
    bump();
  };

  const top = (stack: IHistoryEntry[]) => (stack.length ? stack[stack.length - 1].label : undefined);
  return {
    commit, undo, redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    undoLabel: top(past.current),
    redoLabel: top(future.current)
  };
}
