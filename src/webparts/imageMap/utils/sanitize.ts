import { AreaBorderStyle, DEFAULT_HOVER, IHoverStyle, IImageArea } from '../models/IImageMap';
import { ISecurityPolicy } from '../config/securityConfig';
import { normalizeRect } from './geometry';
import { asRecord } from './untyped';

const COLOR_PATTERN = /^(#[0-9a-f]{3,8}|rgba?\(\s*[\d.\s,%]+\)|hsla?\(\s*[\d.\s,%deg]+\)|[a-z]{3,30})$/i;
const BORDER_STYLES: AreaBorderStyle[] = ['solid', 'dashed', 'dotted', 'double'];
const ID_PATTERN = /^[a-z0-9_-]{1,64}$/i;

/** Allows only valid CSS color values (prevents CSS injection via color values). */
export function safeColor(value: unknown, fallback: string): string {
  const v = typeof value === 'string' ? value.trim() : '';
  return COLOR_PATTERN.test(v) ? v : fallback;
}

export function safeNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : (typeof value === 'string' ? parseFloat(value) : NaN);
  if (isNaN(n) || !isFinite(n)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, n));
}

export function safeBorderStyle(value: unknown): AreaBorderStyle {
  return BORDER_STYLES.indexOf(value as AreaBorderStyle) >= 0 ? value as AreaBorderStyle : 'solid';
}

function safeString(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.substr(0, maxLength) : '';
}

/** Opacity of a CSS color (0–1), for the visibility warning. */
export function colorAlpha(color: string): number {
  const c = (color || '').trim().toLowerCase();
  if (c === 'transparent') { return 0; }
  const rgba = /^rgba\(([^)]+)\)$/.exec(c) || /^hsla\(([^)]+)\)$/.exec(c);
  if (rgba) {
    const parts = rgba[1].split(',');
    const a = parseFloat(parts[3]);
    return isNaN(a) ? 1 : (parts[3].indexOf('%') >= 0 ? a / 100 : a);
  }
  if (/^#[0-9a-f]{8}$/.test(c)) { return parseInt(c.substr(7, 2), 16) / 255; }
  if (/^#[0-9a-f]{4}$/.test(c)) { return parseInt(c.charAt(4) + c.charAt(4), 16) / 255; }
  return 1;
}

export function sanitizeHover(raw: unknown): IHoverStyle {
  const h = asRecord(raw);
  return {
    borderColor: safeColor(h.borderColor, DEFAULT_HOVER.borderColor),
    borderWidth: safeNumber(h.borderWidth, 0, 20, DEFAULT_HOVER.borderWidth),
    borderStyle: safeBorderStyle(h.borderStyle),
    fillColor: safeColor(h.fillColor, DEFAULT_HOVER.fillColor),
    borderRadius: safeNumber(h.borderRadius, 0, 200, 0)
  };
}

/**
 * Web part properties are untrusted (they can be tampered with e.g. via REST or by
 * editing the page JSON). Therefore everything is typed, limited and sanitized on load.
 */
export function sanitizeAreas(raw: unknown, policy: ISecurityPolicy): IImageArea[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const items: unknown[] = raw;
  const seen: { [id: string]: boolean } = {};
  return items
    .filter((item: unknown) => !!item && typeof item === 'object')
    .slice(0, policy.maxAreas)
    .map((item: unknown, index: number): IImageArea => {
      const a = asRecord(item);
      let id = typeof a.id === 'string' && ID_PATTERN.test(a.id) ? a.id : `area-${index}`;
      if (seen[id]) { id = `area-${index}-dup`; }
      seen[id] = true;
      const rect = normalizeRect({
        x: safeNumber(a.x, 0, 100, 0),
        y: safeNumber(a.y, 0, 100, 0),
        width: safeNumber(a.width, 0, 100, 10),
        height: safeNumber(a.height, 0, 100, 10)
      });
      return {
        id,
        shape: a.shape === 'ellipse' || a.shape === 'circle' ? a.shape : 'rect',
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        url: safeString(a.url, policy.maxUrlLength),
        openInNewTab: a.openInNewTab === true,
        title: safeString(a.title, policy.maxTitleLength),
        tooltip: safeString(a.tooltip, policy.maxTooltipLength),
        hover: sanitizeHover(a.hover)
      };
    });
}
