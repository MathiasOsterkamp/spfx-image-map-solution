import { ISecurityPolicy } from '../config/securityConfig';
import { IImageArea } from '../models/IImageMap';
import * as strings from 'ImageMapWebPartStrings';

export type LinkKind = 'internal' | 'external' | 'mailto' | 'tel' | 'anchor';

export interface IUrlCheck {
  valid: boolean;
  url: string;
  kind?: LinkKind;
  error?: string;
  warning?: string;
  /** Suggested fix, e.g. "https://www.firma.de" for "www.firma.de" */
  suggestion?: string;
}

const SCHEME = /^([a-z][a-z0-9+.-]*):/i;
const LABEL = '[a-z0-9\\u00c0-\\u024f](?:[a-z0-9\\u00c0-\\u024f\\-]{0,61}[a-z0-9\\u00c0-\\u024f])?';
const HOSTNAME = new RegExp(`^${LABEL}(?:\\.${LABEL})*$`, 'i');
const LOOKS_LIKE_DOMAIN = /^(www\.)?[a-z0-9À-ɏ-]+(\.[a-z0-9À-ɏ-]+)*\.[a-z]{2,}([/?#:]|$)/i;
/** Invisible characters and text direction overrides (spoofing, "Trojan Source"). */
const INVISIBLE_CHARS = /[\u00ad\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/;
/** Characters not allowed in links (must be percent-encoded). */
const URL_FORBIDDEN = /[<>"`{}|^[\]]/g;
/** Characters not allowed in title, tooltip and alt text. */
const TEXT_FORBIDDEN = /[<>{}[\]\\`|^~]/g;
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/;
const MAX_HOST_LENGTH = 253;
const GENERIC_LINK_TEXTS = [
  'hier', 'hier klicken', 'klicken', 'klick', 'mehr', 'weiter', 'link', 'details',
  'click here', 'more', 'here', 'read more',
  'ici', 'cliquez ici', 'cliquer ici', 'plus', 'en savoir plus', 'lien', 'suite'
];

function fail(url: string, error: string, suggestion?: string): IUrlCheck {
  return { valid: false, url, error, suggestion };
}

function uniqueChars(value: string, pattern: RegExp): string[] {
  const found: string[] = [];
  (value.match(pattern) || []).forEach((c: string) => {
    if (found.indexOf(c) < 0) { found.push(c); }
  });
  return found;
}

function quoteChars(chars: string[]): string {
  return chars.map((c: string) => strings.quote(c)).join(' ');
}

function percentEncodeChar(c: string): string {
  const hex = c.charCodeAt(0).toString(16).toUpperCase();
  return '%' + (hex.length < 2 ? '0' : '') + hex;
}

/** Replaces spaces and disallowed characters with their percent encoding (without double-encoding existing %XX). */
function encodeForbidden(url: string): string {
  return url.replace(/ /g, '%20').replace(URL_FORBIDDEN, percentEncodeChar);
}

/** Checks that apply to every kind of URL. Returns an error text and, if applicable, a suggested fix. */
function basicError(url: string, maxLength: number): { error: string; suggestion?: string } | undefined {
  if (url.length > maxLength) {
    return { error: strings.linkTooLong(url.length, maxLength) };
  }
  if (CONTROL_CHARS.test(url) || /[\t\r\n]/.test(url)) {
    return { error: strings.linkControlChars };
  }
  if (INVISIBLE_CHARS.test(url)) {
    return { error: strings.linkInvisibleChars };
  }
  if (url.indexOf('\\') >= 0) {
    return { error: strings.linkBackslash, suggestion: url.replace(/\\/g, '/') };
  }
  const forbidden = uniqueChars(url, URL_FORBIDDEN);
  if (/\s/.test(url) || forbidden.length) {
    return {
      error: strings.linkMustBeEncoded(/\s/.test(url), forbidden.length ? quoteChars(forbidden) : undefined),
      suggestion: /[^\S ]/.test(url) ? undefined : encodeForbidden(url)
    };
  }
  if (/%(?![0-9a-f]{2})/i.test(url)) {
    return { error: strings.invalidPercentEncoding };
  }
  return undefined;
}

/** Path part (without query/fragment), decoded. */
function decodedPath(pathAndMore: string): string {
  const path = pathAndMore.split(/[?#]/)[0];
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

function pathError(path: string, policy: ISecurityPolicy): string | undefined {
  const decoded = decodedPath(path);
  if (decoded.length > policy.maxSharePointPathLength) {
    return strings.pathTooLong(decoded.length, policy.maxSharePointPathLength);
  }
  return undefined;
}

export function hostMatches(host: string, domain: string): boolean {
  if (host === domain) { return true; }
  const suffix = '.' + domain;
  return host.length > suffix.length && host.substr(host.length - suffix.length) === suffix;
}

interface IParsedHttp { protocol: string; hostname: string; hasUserInfo: boolean; }

function parseHttp(url: string): IParsedHttp | undefined {
  const m = /^(https?):\/\/([^/?#]*)/i.exec(url);
  if (!m) { return undefined; }
  const authority = m[2];
  const hostPort = authority.substr(authority.lastIndexOf('@') + 1);
  const hostname = hostPort.replace(/:\d{1,5}$/, '').toLowerCase();
  if (!hostname || hostname.indexOf(':') >= 0 || !HOSTNAME.test(hostname)) { return undefined; }
  return { protocol: m[1].toLowerCase(), hostname, hasUserInfo: authority.indexOf('@') >= 0 };
}

/**
 * Validates an area link. Only the following are allowed:
 *  - server-relative links (/sites/…), anchors (#…)
 *  - https:// (http:// only on the own host or if httpsOnly = false)
 *  - mailto: and tel:
 * Everything else (javascript:, data:, file:, //host, user:password@ …) is rejected.
 */
export function checkLinkUrl(raw: string | undefined, policy: ISecurityPolicy): IUrlCheck {
  const url = (raw || '').trim();
  if (!url) { return fail(url, strings.enterLink); }
  const basic = basicError(url, policy.maxUrlLength);
  if (basic) { return fail(url, basic.error, basic.suggestion); }

  if (url.charAt(0) === '#') {
    return url.length > 1 ? { valid: true, url, kind: 'anchor' } : fail(url, strings.emptyAnchor);
  }
  if (url.substr(0, 2) === '//') {
    return fail(url, strings.protocolRelativeLink, 'https:' + url);
  }
  if (url.charAt(0) === '/') {
    const tooLong = pathError(url, policy);
    return tooLong ? fail(url, tooLong) : { valid: true, url, kind: 'internal' };
  }

  const scheme = SCHEME.exec(url);
  if (!scheme || scheme[1].indexOf('.') >= 0) {
    if (LOOKS_LIKE_DOMAIN.test(url)) {
      return fail(url, strings.linkNeedsHttps, 'https://' + url);
    }
    return fail(url, strings.relativeLinkSlash);
  }

  const protocol = scheme[1].toLowerCase();
  if (protocol === 'mailto') {
    const m = /^mailto:([^@/?#]+)@([^@/?#]+\.[^@/?#]+)(\?.*)?$/i.exec(url);
    if (!m) { return fail(url, strings.invalidEmail); }
    if (m[1].length > 64 || m[1].length + 1 + m[2].length > 254) {
      return fail(url, strings.emailTooLong);
    }
    if (!HOSTNAME.test(m[2].toLowerCase())) { return fail(url, strings.invalidEmailDomain); }
    return { valid: true, url, kind: 'mailto' };
  }
  if (protocol === 'tel') {
    return /^tel:\+?[0-9()\-./]{3,30}$/i.test(url)
      ? { valid: true, url, kind: 'tel' }
      : fail(url, strings.invalidPhone);
  }
  if (protocol !== 'http' && protocol !== 'https') {
    return fail(url, strings.protocolNotAllowed(protocol));
  }

  const parsed = parseHttp(url);
  if (!parsed) { return fail(url, strings.invalidWebAddress); }
  if (parsed.hasUserInfo) { return fail(url, strings.linkUserInfo); }
  if (parsed.hostname.length > MAX_HOST_LENGTH) { return fail(url, strings.domainTooLong(MAX_HOST_LENGTH)); }

  const internal = parsed.hostname === policy.currentHost;
  if (internal) {
    const tooLong = pathError(url.substr(url.indexOf(parsed.hostname) + parsed.hostname.length).replace(/^:\d+/, ''), policy);
    if (tooLong) { return fail(url, tooLong); }
  }
  let warning: string | undefined;
  if (parsed.protocol === 'http' && !internal) {
    if (policy.httpsOnly) {
      return fail(url, strings.httpLinkNotAllowed, 'https' + url.substr(4));
    }
    warning = strings.httpWarning;
  }
  if (!internal && policy.allowedLinkDomains.length > 0 &&
    !policy.allowedLinkDomains.some((d: string) => hostMatches(parsed.hostname, d))) {
    return fail(url, strings.domainNotAllowed(parsed.hostname, policy.allowedLinkDomains.join(', ')));
  }
  return { valid: true, url, kind: internal ? 'internal' : 'external', warning };
}

/** Validates an image URL: server-relative or https, by default only from the own host. */
export function checkImageUrl(raw: string | undefined, policy: ISecurityPolicy): IUrlCheck {
  // Spaces in file names are common ("my image.png") and harmless: encode them instead of rejecting.
  // The returned url is the encoded one and is what gets rendered.
  const url = (raw || '').trim().replace(/ /g, '%20');
  if (!url) { return fail(url, strings.chooseImageError); }
  const basic = basicError(url, policy.maxUrlLength);
  if (basic) { return fail(url, basic.error, basic.suggestion); }
  if (url.substr(0, 2) === '//') { return fail(url, strings.protocolRelativeUrl, 'https:' + url); }
  if (url.charAt(0) === '/') {
    const tooLong = pathError(url, policy);
    return tooLong ? fail(url, tooLong) : { valid: true, url, kind: 'internal' };
  }

  const parsed = parseHttp(url);
  if (!parsed) {
    return LOOKS_LIKE_DOMAIN.test(url)
      ? fail(url, strings.imageUrlNeedsHttps, 'https://' + url)
      : fail(url, strings.imageUrlOnlyHttps);
  }
  if (parsed.hasUserInfo) { return fail(url, strings.imageUrlUserInfo); }
  if (parsed.hostname.length > MAX_HOST_LENGTH) { return fail(url, strings.domainTooLong(MAX_HOST_LENGTH)); }
  const internal = parsed.hostname === policy.currentHost;
  if (parsed.protocol === 'http' && !internal) {
    return fail(url, strings.imageNeedsHttps, 'https' + url.substr(4));
  }
  if (!internal && policy.imagesSameHostOnly &&
    !policy.allowedImageHosts.some((d: string) => hostMatches(parsed.hostname, d))) {
    return fail(url, strings.imageSameHostOnly);
  }
  return { valid: true, url, kind: internal ? 'internal' : 'external' };
}

/** Path relative to the site, without path traversal (..), protocols or special characters. Empty string = valid. */
export function validateFolderPath(value: string | undefined): string {
  const f = (value || '').trim();
  if (!f) { return strings.folderRequired; }
  if (f.charAt(0) === '/') { return strings.folderRelative; }
  if (f.length > 200) { return strings.folderTooLong; }
  if (/\.\.|\/\/|[\\:*?"<>|#%~&{}\u0000-\u001f]/.test(f)) {
    return strings.folderInvalid;
  }
  return '';
}

export interface ITextCheck { error?: string; warning?: string; }

/**
 * Validates free text (title, tooltip, alt text):
 * length, control characters, invisible characters and the special characters < > { } [ ] \ ` | ^ ~
 */
export function checkText(value: string | undefined, maxLength: number, required: boolean, requiredMessage: string): ITextCheck {
  const raw = value || '';
  const t = raw.trim();
  if (!t) { return required ? { error: requiredMessage } : {}; }
  if (raw.length > maxLength) { return { error: strings.textTooLong(raw.length, maxLength) }; }
  if (CONTROL_CHARS.test(raw) || /[\t\r\n]/.test(raw)) { return { error: strings.textControlChars }; }
  if (INVISIBLE_CHARS.test(raw)) { return { error: strings.textInvisibleChars }; }
  const forbidden = uniqueChars(raw, TEXT_FORBIDDEN);
  if (forbidden.length) { return { error: strings.textForbiddenChars(quoteChars(forbidden)) }; }
  return {};
}

/** Removes everything checkText would reject (for displaying legacy data). */
export function cleanText(value: string | undefined, maxLength: number): string {
  return (value || '')
    .replace(new RegExp(CONTROL_CHARS.source, 'g'), '')
    .replace(new RegExp(INVISIBLE_CHARS.source, 'g'), '')
    .replace(/[\t\r\n]+/g, ' ')
    .replace(TEXT_FORBIDDEN, '')
    .trim()
    .substr(0, maxLength);
}

export function checkTitle(title: string | undefined, maxLength: number): ITextCheck {
  const result = checkText(title, maxLength, true, strings.titleRequired);
  if (!result.error && GENERIC_LINK_TEXTS.indexOf((title || '').trim().toLowerCase()) >= 0) {
    return { warning: strings.titleGeneric };
  }
  return result;
}

export function checkTooltip(tooltip: string | undefined, maxLength: number): ITextCheck {
  return checkText(tooltip, maxLength, false, '');
}

export function checkAlt(alt: string | undefined, maxLength: number): string | undefined {
  return checkText(alt, maxLength, true, strings.altMissing).error;
}

export interface IValidationIssue {
  areaId?: string;
  areaIndex?: number;
  field: 'alt' | 'url' | 'title' | 'tooltip';
  message: string;
}

/** Collects all errors for the overview in the editor. */
export function collectIssues(areas: IImageArea[], imageAlt: string, policy: ISecurityPolicy): IValidationIssue[] {
  const issues: IValidationIssue[] = [];
  const altError = checkAlt(imageAlt, policy.maxAltLength);
  if (altError) { issues.push({ field: 'alt', message: altError }); }
  areas.forEach((area: IImageArea, index: number) => {
    const link = checkLinkUrl(area.url, policy);
    if (!link.valid) {
      issues.push({ areaId: area.id, areaIndex: index, field: 'url', message: strings.issueArea(index + 1, link.error || '') });
    }
    const title = checkTitle(area.title, policy.maxTitleLength);
    if (title.error) {
      issues.push({ areaId: area.id, areaIndex: index, field: 'title', message: strings.issueTitle(index + 1, title.error) });
    }
    const tooltip = checkTooltip(area.tooltip, policy.maxTooltipLength);
    if (tooltip.error) {
      issues.push({ areaId: area.id, areaIndex: index, field: 'tooltip', message: strings.issueTooltip(index + 1, tooltip.error) });
    }
  });
  return issues;
}
