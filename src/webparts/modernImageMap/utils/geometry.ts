import { IImageArea, IHoverStyle, newId } from '../models/IImageMap';

export interface IPoint { x: number; y: number; }
export interface IRect { x: number; y: number; width: number; height: number; }

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
export const RESIZE_HANDLES: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

/** Minimum size of an area in % */
export const MIN_AREA_SIZE = 1;
/** Minimum size when dragging, so a simple click does not create an area */
export const MIN_DRAW_SIZE = 2;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Converts screen coordinates into percentage coordinates relative to the element. */
export function toPercentPoint(clientX: number, clientY: number, element: HTMLElement): IPoint {
  const box = element.getBoundingClientRect();
  if (!box.width || !box.height) {
    return { x: 0, y: 0 };
  }
  return {
    x: clamp(((clientX - box.left) / box.width) * 100, 0, 100),
    y: clamp(((clientY - box.top) / box.height) * 100, 0, 100)
  };
}

export function rectFromPoints(a: IPoint, b: IPoint): IRect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y)
  };
}

export function toRect(area: IRect): IRect {
  return { x: area.x, y: area.y, width: area.width, height: area.height };
}

/** Clamps a rectangle to the image area and rounds to 2 decimal places. */
export function normalizeRect(r: IRect): IRect {
  const width = clamp(r.width, MIN_AREA_SIZE, 100);
  const height = clamp(r.height, MIN_AREA_SIZE, 100);
  return {
    x: round2(clamp(r.x, 0, 100 - width)),
    y: round2(clamp(r.y, 0, 100 - height)),
    width: round2(width),
    height: round2(height)
  };
}

export function moveRect(r: IRect, dx: number, dy: number): IRect {
  return {
    x: clamp(r.x + dx, 0, 100 - r.width),
    y: clamp(r.y + dy, 0, 100 - r.height),
    width: r.width,
    height: r.height
  };
}

export function resizeRect(r: IRect, handle: ResizeHandle, p: IPoint): IRect {
  let left = r.x;
  let top = r.y;
  let right = r.x + r.width;
  let bottom = r.y + r.height;
  if (handle.indexOf('w') >= 0) { left = Math.min(p.x, right - MIN_AREA_SIZE); }
  if (handle.indexOf('e') >= 0) { right = Math.max(p.x, left + MIN_AREA_SIZE); }
  if (handle.indexOf('n') >= 0) { top = Math.min(p.y, bottom - MIN_AREA_SIZE); }
  if (handle.indexOf('s') >= 0) { bottom = Math.max(p.y, top + MIN_AREA_SIZE); }
  return { x: left, y: top, width: right - left, height: bottom - top };
}

// ---------------- Circles ----------------
// Percentages refer horizontally to the image width and vertically to the image height.
// For a circle to stay round: height% = width% × ratio  (ratio = image width / image height).

/** Circle from left/top edge and diameter (in % of image width), clamped to the image. */
export function circleFromWidth(x: number, y: number, diameter: number, ratio: number): IRect {
  const r = ratio > 0 && isFinite(ratio) ? ratio : 1;
  let width = clamp(diameter, MIN_AREA_SIZE, 100);
  let height = width * r;
  if (height > 100) {
    height = 100;
    width = height / r;
  }
  return {
    x: round2(clamp(x, 0, 100 - width)),
    y: round2(clamp(y, 0, 100 - height)),
    width: round2(width),
    height: round2(height)
  };
}

/** Circle while dragging: diameter = the larger of the two drag directions (measured in pixels). */
export function circleFromDrag(start: IPoint, p: IPoint, ratio: number): IRect {
  const dx = p.x - start.x;
  const dy = (p.y - start.y) / ratio; // converted to "width percent"
  const d = Math.max(Math.abs(dx), Math.abs(dy));
  const width = d;
  const height = d * ratio;
  return {
    x: dx < 0 ? start.x - width : start.x,
    y: dy < 0 ? start.y - height : start.y,
    width,
    height
  };
}

/** Resize a circle via a handle; the opposite side stays fixed. */
export function resizeCircle(r: IRect, handle: ResizeHandle, p: IPoint, ratio: number): IRect {
  const hasW = handle.indexOf('w') >= 0;
  const hasE = handle.indexOf('e') >= 0;
  const hasN = handle.indexOf('n') >= 0;
  const hasS = handle.indexOf('s') >= 0;
  const anchorX = hasW ? r.x + r.width : r.x;
  const anchorY = hasN ? r.y + r.height : r.y;
  let d = 0;
  if (hasW || hasE) { d = Math.max(d, Math.abs(p.x - anchorX)); }
  if (hasN || hasS) { d = Math.max(d, Math.abs(p.y - anchorY) / ratio); }
  d = Math.max(d, MIN_AREA_SIZE);
  const height = d * ratio;
  return {
    x: hasW ? anchorX - d : r.x,
    y: hasN ? anchorY - height : r.y,
    width: d,
    height
  };
}

/** Normalizes depending on shape (circles stay round). */
export function normalizeShapeRect(r: IRect, shape: string, ratio: number): IRect {
  return shape === 'circle' ? circleFromWidth(r.x, r.y, r.width, ratio) : normalizeRect(r);
}

export function createArea(rect: IRect, hover: IHoverStyle, shape: 'rect' | 'circle' | 'ellipse' = 'rect', ratio: number = 1): IImageArea {
  const r = normalizeShapeRect(rect, shape, ratio);
  return {
    id: newId(),
    shape,
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
    url: '',
    openInNewTab: false,
    title: '',
    tooltip: '',
    hover: { ...hover }
  };
}

/** Searches upward from `start` to `stop` for an attribute (IE11 does not support Element.closest). */
export function findAttribute(start: HTMLElement | null, attribute: string, stop: HTMLElement): string | undefined {
  let el: HTMLElement | null = start;
  while (el && el !== stop) {
    const value = el.getAttribute(attribute);
    if (value) {
      return value;
    }
    el = el.parentElement;
  }
  return undefined;
}
