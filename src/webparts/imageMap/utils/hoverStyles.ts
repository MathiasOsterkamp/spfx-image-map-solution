import { HighContrastSelector, IRawStyle, mergeStyles } from '@fluentui/react/lib/Styling';
import * as strings from 'ImageMapWebPartStrings';
import { colorAlpha, safeBorderStyle, safeColor, safeNumber } from './sanitize';
import { AreaShape, DEFAULT_HOVER, IHoverStyle, IImageArea } from '../models/IImageMap';

/** Two-color focus ring (white + black): visible on any image background (WCAG 2.4.7 / 2.4.11). */
const FOCUS_RING = '0 0 0 2px #ffffff, 0 0 0 5px #000000';

/** Returns the (sanitized) CSS values of the hover state. */
export function getHoverRawStyle(hover: IHoverStyle | undefined, shape: AreaShape): IRawStyle {
  const h = hover || DEFAULT_HOVER;
  return {
    borderColor: safeColor(h.borderColor, DEFAULT_HOVER.borderColor),
    borderWidth: `${safeNumber(h.borderWidth, 0, 20, DEFAULT_HOVER.borderWidth)}px`,
    borderStyle: safeBorderStyle(h.borderStyle),
    backgroundColor: safeColor(h.fillColor, 'transparent'),
    borderRadius: shape === 'ellipse' || shape === 'circle' ? '50%' : `${safeNumber(h.borderRadius, 0, 200, 0)}px`
  };
}

/** Warning when the hover state is barely visible (WCAG 1.4.11 non-text contrast). */
export function getVisibilityWarning(hover: IHoverStyle): string | undefined {
  const border = safeNumber(hover.borderWidth, 0, 20, 0);
  const borderAlpha = colorAlpha(hover.borderColor);
  const fillAlpha = colorAlpha(hover.fillColor);
  const borderVisible = border >= 2 && borderAlpha >= 0.6;
  if (!borderVisible && fillAlpha < 0.25) {
    return strings.visibilityWarning;
  }
  return undefined;
}

/**
 * CSS class for an area's link in display mode.
 *  - :hover shows the configured style
 *  - :focus additionally shows a high-contrast focus ring
 *  - Windows high contrast mode: system colors (Highlight) instead of custom colors
 *  - prefers-reduced-motion: no transition animation
 */
export function getViewAreaClass(area: IImageArea, hint: boolean): string {
  const hover = getHoverRawStyle(area.hover, area.shape);
  const rest: IRawStyle = hint
    ? { ...hover, opacity: 0.5 }
    : {
      borderWidth: hover.borderWidth,
      borderStyle: hover.borderStyle,
      borderRadius: hover.borderRadius,
      borderColor: 'transparent',
      backgroundColor: 'transparent'
    };

  return mergeStyles({
    // Fills the <li> incl. padding (needed for circles whose height comes from padding-bottom)
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    display: 'block',
    boxSizing: 'border-box',
    cursor: 'pointer',
    outline: 'none',
    transition: 'background-color .15s ease, border-color .15s ease, opacity .15s ease',
    ...rest,
    selectors: {
      ':hover': { ...hover, opacity: 1 },
      ':focus': { ...hover, opacity: 1, boxShadow: FOCUS_RING },
      '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
      [HighContrastSelector]: {
        borderColor: hint ? 'LinkText' : 'transparent',
        selectors: {
          ':hover': { borderColor: 'Highlight', borderStyle: 'solid' },
          ':focus': { borderColor: 'Highlight', borderStyle: 'solid', outline: '3px solid Highlight', outlineOffset: '2px' }
        }
      }
    }
  });
}

/** In the editor the hover style is shown permanently so the result is visible. */
export function getEditAreaClass(area: IImageArea): string {
  return mergeStyles({
    ...getHoverRawStyle(area.hover, area.shape),
    selectors: {
      ':focus': { outline: 'none', boxShadow: FOCUS_RING },
      [HighContrastSelector]: {
        borderColor: 'CanvasText',
        selectors: { ':focus': { outline: '3px solid Highlight', outlineOffset: '2px' } }
      }
    }
  });
}
