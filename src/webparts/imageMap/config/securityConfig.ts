/**
 * CENTRAL SECURITY CONFIGURATION
 *
 * These values are deliberately NOT editable in the property pane: page editors must not be able to
 * relax the rules. Changes are made here in code and rolled out with the package.
 * All rules apply when editing AND again when displaying (tampered web part data is ignored).
 */

export type ImageType = 'png' | 'jpeg' | 'gif' | 'webp';

export const SECURITY_SETTINGS = {
  /** External links via https only. http is only allowed for the own SharePoint host. */
  httpsOnly: true,
  /** Allowed external domains (incl. subdomains), e.g. ['firma.de', 'microsoft.com']. Empty = all domains allowed. */
  allowedLinkDomains: [] as string[],
  /** Images only from the own SharePoint (prevents tracking pixels and third-party content). */
  imagesSameHostOnly: true,
  /** Additional allowed image hosts if imagesSameHostOnly = true (e.g. a custom CDN). */
  allowedImageHosts: [] as string[],
  /** Maximum upload size in MB. */
  maxUploadMB: 10,
  /** Allowed upload formats. The file content (signature) is checked, not just the extension. SVG is intentionally excluded (can contain scripts). */
  allowedUploadTypes: ['png', 'jpeg', 'gif', 'webp'] as ImageType[],
  /** Maximum number of areas per image. */
  maxAreas: 100,
  /** Maximum total length of a link (common browser/server limit). */
  maxUrlLength: 2048,
  /** Maximum path length within SharePoint (decoded, SharePoint Online/2019 limit). */
  maxSharePointPathLength: 400,
  /** Maximum length of title, tooltip and alt text. */
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
