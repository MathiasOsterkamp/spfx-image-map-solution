/**
 * Data model of the web part.
 * All positions/sizes are stored in PERCENT relative to the image (0-100).
 * This way the areas scale automatically with the image (responsive).
 */

/** rect = rectangle, circle = circle (stays round at any aspect ratio), ellipse = ellipse */
export type AreaShape = 'rect' | 'circle' | 'ellipse';
export type AreaBorderStyle = 'solid' | 'dashed' | 'dotted' | 'double';

export interface IHoverStyle {
  /** CSS color of the border, e.g. #0078d4 */
  borderColor: string;
  /** Border width in px */
  borderWidth: number;
  /** Border style */
  borderStyle: AreaBorderStyle;
  /** Fill color incl. transparency, e.g. rgba(0, 120, 212, 0.2) */
  fillColor: string;
  /** Corner radius in px (rectangles only) */
  borderRadius: number;
}

export interface IImageArea {
  id: string;
  shape: AreaShape;
  /** Left edge in % of image width */
  x: number;
  /** Top edge in % of image height */
  y: number;
  /** Width in % of image width */
  width: number;
  /** Height in % of image height. For circles, derived from width and aspect ratio. */
  height: number;
  url: string;
  openInNewTab: boolean;
  /** Title = link text (required). Read aloud by screen readers. */
  title: string;
  /** Optional tooltip. Empty = title is used as tooltip. */
  tooltip?: string;
  hover: IHoverStyle;
}

export const DEFAULT_HOVER: IHoverStyle = {
  borderColor: '#0078d4',
  borderWidth: 3,
  borderStyle: 'solid',
  fillColor: 'rgba(0, 120, 212, 0.2)',
  borderRadius: 0
};

export function newId(): string {
  return 'a' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

export type HoverPresetKey = 'markant' | 'dezent' | 'rahmen' | 'hervorheben';

export interface IHoverPreset {
  key: HoverPresetKey;
  hover: IHoverStyle;
}

/** Style presets (names and descriptions: strings.presets). A preset only fills the hover values; there is no dedicated data field. */
export const HOVER_PRESETS: IHoverPreset[] = [
  {
    key: 'markant',
    hover: { borderColor: '#0078d4', borderWidth: 3, borderStyle: 'solid', fillColor: 'rgba(0, 120, 212, 0.2)', borderRadius: 0 }
  },
  {
    key: 'dezent',
    hover: { borderColor: 'rgba(255, 255, 255, 0.9)', borderWidth: 2, borderStyle: 'solid', fillColor: 'rgba(255, 255, 255, 0.3)', borderRadius: 4 }
  },
  {
    key: 'rahmen',
    hover: { borderColor: '#323130', borderWidth: 3, borderStyle: 'dashed', fillColor: 'rgba(0, 0, 0, 0)', borderRadius: 0 }
  },
  {
    key: 'hervorheben',
    hover: { borderColor: '#ffb900', borderWidth: 4, borderStyle: 'solid', fillColor: 'rgba(255, 185, 0, 0.3)', borderRadius: 0 }
  }
];

function normColor(c: string): string {
  return (c || '').replace(/\s+/g, '').toLowerCase();
}

/** Returns the matching preset or undefined (= custom style). */
export function matchPreset(hover: IHoverStyle | undefined): HoverPresetKey | undefined {
  if (!hover) { return undefined; }
  for (const p of HOVER_PRESETS) {
    const h = p.hover;
    if (normColor(h.borderColor) === normColor(hover.borderColor) && h.borderWidth === hover.borderWidth &&
      h.borderStyle === hover.borderStyle && normColor(h.fillColor) === normColor(hover.fillColor) &&
      h.borderRadius === hover.borderRadius) {
      return p.key;
    }
  }
  return undefined;
}
