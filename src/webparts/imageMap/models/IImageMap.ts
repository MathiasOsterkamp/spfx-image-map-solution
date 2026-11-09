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
