import { getColorFromString } from '@fluentui/react/lib/Color';
import { createTheme, IPalette, ISemanticColors, ITheme } from '@fluentui/react/lib/Theme';
import { safeColor } from './sanitize';
import { asRecord, IUntyped } from './untyped';

/**
 * Calculates the Fluent UI theme from the theme of the current SharePoint site.
 *
 * SPFx 1.4.1 has no theme service yet, and the web part bundles its own Fluent UI 8, which
 * does not know the site colors. SharePoint publishes the active theme as color slots
 * (themePrimary, neutralPrimary, bodyText …) in window.__themeState__.theme. Slots known to
 * Fluent UI are taken from there, everything else is derived by createTheme from the palette.
 * Without a SharePoint theme (e.g. local workbench) the Fluent UI default theme is returned.
 */
export function createSharePointTheme(): ITheme {
  const defaults = createTheme({});
  const slots = asRecord(asRecord(asRecord(window).__themeState__).theme);

  const palette = pickColors(slots, Object.keys(defaults.palette));
  if (Object.keys(palette).length === 0) {
    return defaults;
  }
  const semanticColors = pickColors(slots, Object.keys(defaults.semanticColors));

  return createTheme({
    palette: palette as Partial<IPalette>,
    semanticColors: semanticColors as Partial<ISemanticColors>,
    isInverted: isDark(palette.white)
  });
}

/** Takes over the named slots, as far as they are valid CSS colors (the values are untrusted). */
function pickColors(slots: IUntyped, names: string[]): { [slot: string]: string } {
  const colors: { [slot: string]: string } = {};
  names.forEach((name: string) => {
    const color = safeColor(slots[name], '');
    if (color) { colors[name] = color; }
  });
  return colors;
}

/** In dark themes the "white" slot (page background) is a dark color. */
function isDark(background: string | undefined): boolean {
  const color = background ? getColorFromString(background) : undefined;
  return !!color && (0.299 * color.r + 0.587 * color.g + 0.114 * color.b) < 128;
}
