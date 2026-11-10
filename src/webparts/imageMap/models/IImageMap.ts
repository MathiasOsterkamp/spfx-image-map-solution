/**
 * Datenmodell des Webparts.
 * Alle Positionen/Größen werden in PROZENT relativ zum Bild gespeichert (0–100).
 * Dadurch skalieren die Bereiche automatisch mit dem Bild (responsive).
 */

/** rect = Rechteck, circle = Kreis (bleibt bei jedem Seitenverhältnis rund), ellipse = Ellipse */
export type AreaShape = 'rect' | 'circle' | 'ellipse';
export type AreaBorderStyle = 'solid' | 'dashed' | 'dotted' | 'double';

export interface IHoverStyle {
  /** CSS-Farbe des Rahmens, z. B. #0078d4 */
  borderColor: string;
  /** Rahmendicke in px */
  borderWidth: number;
  /** Rahmenstil */
  borderStyle: AreaBorderStyle;
  /** Füllfarbe inkl. Transparenz, z. B. rgba(0, 120, 212, 0.2) */
  fillColor: string;
  /** Eckenradius in px (nur bei Rechtecken) */
  borderRadius: number;
}

export interface IImageArea {
  id: string;
  shape: AreaShape;
  /** Linke Kante in % der Bildbreite */
  x: number;
  /** Obere Kante in % der Bildhöhe */
  y: number;
  /** Breite in % der Bildbreite */
  width: number;
  /** Höhe in % der Bildhöhe. Bei Kreisen aus Breite und Seitenverhältnis abgeleitet. */
  height: number;
  url: string;
  openInNewTab: boolean;
  /** Titel = Linktext (Pflicht). Wird von Screenreadern vorgelesen. */
  title: string;
  /** Optionaler Tooltip. Leer = Titel wird als Tooltip verwendet. */
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
  name: string;
  description: string;
  hover: IHoverStyle;
}

/** Stil-Vorlagen. Eine Vorlage füllt nur die Hover-Werte, es gibt kein eigenes Datenfeld. */
export const HOVER_PRESETS: IHoverPreset[] = [
  {
    key: 'markant', name: 'Markant', description: 'Blauer Rahmen mit leichter Füllung',
    hover: { borderColor: '#0078d4', borderWidth: 3, borderStyle: 'solid', fillColor: 'rgba(0, 120, 212, 0.2)', borderRadius: 0 }
  },
  {
    key: 'dezent', name: 'Dezent', description: 'Heller Rahmen, aufgehellte Fläche – für dunkle Bilder',
    hover: { borderColor: 'rgba(255, 255, 255, 0.9)', borderWidth: 2, borderStyle: 'solid', fillColor: 'rgba(255, 255, 255, 0.3)', borderRadius: 4 }
  },
  {
    key: 'rahmen', name: 'Nur Rahmen', description: 'Dunkler gestrichelter Rahmen ohne Füllung',
    hover: { borderColor: '#323130', borderWidth: 3, borderStyle: 'dashed', fillColor: 'rgba(0, 0, 0, 0)', borderRadius: 0 }
  },
  {
    key: 'hervorheben', name: 'Hervorheben', description: 'Gelber Rahmen mit gelber Füllung',
    hover: { borderColor: '#ffb900', borderWidth: 4, borderStyle: 'solid', fillColor: 'rgba(255, 185, 0, 0.3)', borderRadius: 0 }
  }
];

function normColor(c: string): string {
  return (c || '').replace(/\s+/g, '').toLowerCase();
}

/** Liefert die passende Vorlage oder undefined (= eigener Stil). */
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
