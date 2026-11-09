/**
 * ZENTRALE SICHERHEITSKONFIGURATION
 *
 * Diese Werte sind bewusst NICHT im Eigenschaftenbereich änderbar: Seitenbearbeiter sollen die
 * Regeln nicht lockern können. Änderungen erfolgen hier im Code und werden mit dem Paket ausgerollt.
 * Alle Regeln gelten beim Bearbeiten UND erneut beim Anzeigen (manipulierte Webpart-Daten werden ignoriert).
 */

export type ImageType = 'png' | 'jpeg' | 'gif' | 'webp';

export const SECURITY_SETTINGS = {
  /** Externe Links nur über https. http ist nur für den eigenen SharePoint-Host erlaubt. */
  httpsOnly: true,
  /** Freigegebene externe Domains (inkl. Subdomains), z. B. ['firma.de', 'microsoft.com']. Leer = alle Domains erlaubt. */
  allowedLinkDomains: [] as string[],
  /** Bilder nur aus dem eigenen SharePoint (verhindert Tracking-Pixel und fremde Inhalte). */
  imagesSameHostOnly: true,
  /** Zusätzlich erlaubte Bild-Hosts, falls imagesSameHostOnly = true (z. B. ein eigenes CDN). */
  allowedImageHosts: [] as string[],
  /** Maximale Upload-Größe in MB. */
  maxUploadMB: 10,
  /** Erlaubte Upload-Formate. Geprüft wird der Dateiinhalt (Signatur), nicht nur die Endung. SVG ist absichtlich ausgeschlossen (kann Skripte enthalten). */
  allowedUploadTypes: ['png', 'jpeg', 'gif', 'webp'] as ImageType[],
  /** Maximale Anzahl Bereiche pro Bild. */
  maxAreas: 100,
  /** Maximale Gesamtlänge eines Links (praxisübliche Browser-/Servergrenze). */
  maxUrlLength: 2048,
  /** Maximale Länge des Pfads innerhalb von SharePoint (dekodiert, Grenze von SharePoint Online/2019). */
  maxSharePointPathLength: 400,
  /** Maximale Länge von Titel, Tooltip und Alternativtext. */
  maxTitleLength: 255,
  maxTooltipLength: 255,
  maxAltLength: 255
};

export interface ISecurityPolicy {
  currentHost: string;
  httpsOnly: boolean;
  allowedLinkDomains: string[];
  imagesSameHostOnly: boolean;
  allowedImageHosts: string[];
  maxUploadBytes: number;
  allowedUploadTypes: ImageType[];
  maxAreas: number;
  maxUrlLength: number;
  maxSharePointPathLength: number;
  maxTitleLength: number;
  maxTooltipLength: number;
  maxAltLength: number;
}

export function createSecurityPolicy(webAbsoluteUrl: string): ISecurityPolicy {
  const match = /^https?:\/\/([^\/:?#]+)/i.exec(webAbsoluteUrl || '');
  const normalize = (list: string[]) => list.map((d: string) => d.trim().toLowerCase()).filter((d: string) => !!d);
  return {
    currentHost: match ? match[1].toLowerCase() : '',
    httpsOnly: SECURITY_SETTINGS.httpsOnly,
    allowedLinkDomains: normalize(SECURITY_SETTINGS.allowedLinkDomains),
    imagesSameHostOnly: SECURITY_SETTINGS.imagesSameHostOnly,
    allowedImageHosts: normalize(SECURITY_SETTINGS.allowedImageHosts),
    maxUploadBytes: SECURITY_SETTINGS.maxUploadMB * 1024 * 1024,
    allowedUploadTypes: SECURITY_SETTINGS.allowedUploadTypes.slice(),
    maxAreas: SECURITY_SETTINGS.maxAreas,
    maxUrlLength: SECURITY_SETTINGS.maxUrlLength,
    maxSharePointPathLength: SECURITY_SETTINGS.maxSharePointPathLength,
    maxTitleLength: SECURITY_SETTINGS.maxTitleLength,
    maxTooltipLength: SECURITY_SETTINGS.maxTooltipLength,
    maxAltLength: SECURITY_SETTINGS.maxAltLength
  };
}
