import { ISecurityPolicy } from '../config/securityConfig';
import { IImageArea } from '../models/IImageMap';

export type LinkKind = 'internal' | 'external' | 'mailto' | 'tel' | 'anchor';

export interface IUrlCheck {
  valid: boolean;
  url: string;
  kind?: LinkKind;
  error?: string;
  warning?: string;
  /** Korrekturvorschlag, z. B. "https://www.firma.de" für "www.firma.de" */
  suggestion?: string;
}

const SCHEME = /^([a-z][a-z0-9+.\-]*):/i;
const LABEL = '[a-z0-9\\u00c0-\\u024f](?:[a-z0-9\\u00c0-\\u024f\\-]{0,61}[a-z0-9\\u00c0-\\u024f])?';
const HOSTNAME = new RegExp(`^${LABEL}(?:\\.${LABEL})*$`, 'i');
const LOOKS_LIKE_DOMAIN = /^(www\.)?[a-z0-9À-ɏ\-]+(\.[a-z0-9À-ɏ\-]+)*\.[a-z]{2,}([\/?#:]|$)/i;
/** Unsichtbare Zeichen und Textrichtungs-Umschalter (Spoofing, "Trojan Source"). */
const INVISIBLE_CHARS = /[\u00ad\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/;
/** In Links nicht erlaubte Zeichen (müssen prozentkodiert werden). */
const URL_FORBIDDEN = /[<>"`{}|\^\[\]]/g;
/** In Titel, Tooltip und Alternativtext nicht erlaubte Zeichen. */
const TEXT_FORBIDDEN = /[<>{}\[\]\\`|^~]/g;
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/;
const MAX_HOST_LENGTH = 253;
const GENERIC_LINK_TEXTS = ['hier', 'hier klicken', 'klicken', 'klick', 'mehr', 'weiter', 'link', 'details', 'click here', 'more', 'here'];

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
  return chars.map((c: string) => `„${c}“`).join(' ');
}

function percentEncodeChar(c: string): string {
  const hex = c.charCodeAt(0).toString(16).toUpperCase();
  return '%' + (hex.length < 2 ? '0' : '') + hex;
}

/** Ersetzt Leerzeichen und unerlaubte Zeichen durch ihre Prozentkodierung (ohne bestehende %XX doppelt zu kodieren). */
function encodeForbidden(url: string): string {
  return url.replace(/ /g, '%20').replace(URL_FORBIDDEN, percentEncodeChar);
}

/** Prüfungen, die für jede Art von URL gelten. Gibt Fehlertext und ggf. einen Korrekturvorschlag zurück. */
function basicError(url: string, maxLength: number): { error: string; suggestion?: string } | undefined {
  if (url.length > maxLength) {
    return { error: `Der Link ist zu lang: ${url.length} Zeichen, erlaubt sind maximal ${maxLength}.` };
  }
  if (CONTROL_CHARS.test(url) || /[\t\r\n]/.test(url)) {
    return { error: 'Der Link enthält Steuerzeichen (z. B. Tabulator oder Zeilenumbruch).' };
  }
  if (INVISIBLE_CHARS.test(url)) {
    return { error: 'Der Link enthält unsichtbare Zeichen (z. B. Textrichtungs-Umschaltung). Bitte neu eintippen statt kopieren.' };
  }
  if (url.indexOf('\\') >= 0) {
    return { error: 'Backslashes (\\) sind in Links nicht erlaubt. Bitte / verwenden.', suggestion: url.replace(/\\/g, '/') };
  }
  const forbidden = uniqueChars(url, URL_FORBIDDEN);
  if (/\s/.test(url) || forbidden.length) {
    const what = (/\s/.test(url) ? ['Leerzeichen'] : []).concat(forbidden.length ? [`die Zeichen ${quoteChars(forbidden)}`] : []);
    return {
      error: `Der Link enthält ${what.join(' und ')}. Diese müssen kodiert werden.`,
      suggestion: /[^\S ]/.test(url) ? undefined : encodeForbidden(url)
    };
  }
  if (/%(?![0-9a-f]{2})/i.test(url)) {
    return { error: 'Ungültige Prozentkodierung: Auf % müssen zwei Hex-Ziffern folgen (z. B. %20).' };
  }
  return undefined;
}

/** Pfadanteil (ohne Query/Fragment), dekodiert. */
function decodedPath(pathAndMore: string): string {
  const path = pathAndMore.split(/[?#]/)[0];
  try {
    return decodeURIComponent(path);
  } catch (e) {
    return path;
  }
}

function pathError(path: string, policy: ISecurityPolicy): string | undefined {
  const decoded = decodedPath(path);
  if (decoded.length > policy.maxSharePointPathLength) {
    return `Der SharePoint-Pfad ist zu lang: ${decoded.length} Zeichen, SharePoint erlaubt maximal ${policy.maxSharePointPathLength}.`;
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
  const m = /^(https?):\/\/([^\/?#]*)/i.exec(url);
  if (!m) { return undefined; }
  const authority = m[2];
  const hostPort = authority.substr(authority.lastIndexOf('@') + 1);
  const hostname = hostPort.replace(/:\d{1,5}$/, '').toLowerCase();
  if (!hostname || hostname.indexOf(':') >= 0 || !HOSTNAME.test(hostname)) { return undefined; }
  return { protocol: m[1].toLowerCase(), hostname, hasUserInfo: authority.indexOf('@') >= 0 };
}

/**
 * Prüft einen Bereichs-Link. Erlaubt sind nur:
 *  - serverrelative Links (/sites/…), Sprungmarken (#…)
 *  - https:// (http:// nur auf dem eigenen Host bzw. wenn httpsOnly = false)
 *  - mailto: und tel:
 * Alles andere (javascript:, data:, file:, //host, Benutzer:Passwort@ …) wird abgelehnt.
 */
export function checkLinkUrl(raw: string | undefined, policy: ISecurityPolicy): IUrlCheck {
  const url = (raw || '').trim();
  if (!url) { return fail(url, 'Bitte einen Link eingeben.'); }
  const basic = basicError(url, policy.maxUrlLength);
  if (basic) { return fail(url, basic.error, basic.suggestion); }

  if (url.charAt(0) === '#') {
    return url.length > 1 ? { valid: true, url, kind: 'anchor' } : fail(url, 'Die Sprungmarke ist leer.');
  }
  if (url.substr(0, 2) === '//') {
    return fail(url, 'Protokoll-relative Links (//…) sind nicht erlaubt.', 'https:' + url);
  }
  if (url.charAt(0) === '/') {
    const tooLong = pathError(url, policy);
    return tooLong ? fail(url, tooLong) : { valid: true, url, kind: 'internal' };
  }

  const scheme = SCHEME.exec(url);
  if (!scheme || scheme[1].indexOf('.') >= 0) {
    if (LOOKS_LIKE_DOMAIN.test(url)) {
      return fail(url, 'Bitte den Link vollständig mit https:// angeben.', 'https://' + url);
    }
    return fail(url, 'Relative Links müssen mit / beginnen, z. B. /sites/intranet/SitePages/Seite.aspx.');
  }

  const protocol = scheme[1].toLowerCase();
  if (protocol === 'mailto') {
    const m = /^mailto:([^@\/?#]+)@([^@\/?#]+\.[^@\/?#]+)(\?.*)?$/i.exec(url);
    if (!m) { return fail(url, 'Ungültige E-Mail-Adresse.'); }
    if (m[1].length > 64 || m[1].length + 1 + m[2].length > 254) {
      return fail(url, 'Die E-Mail-Adresse ist zu lang (max. 64 Zeichen vor dem @, insgesamt 254).');
    }
    if (!HOSTNAME.test(m[2].toLowerCase())) { return fail(url, 'Ungültige Domain in der E-Mail-Adresse.'); }
    return { valid: true, url, kind: 'mailto' };
  }
  if (protocol === 'tel') {
    return /^tel:\+?[0-9()\-.\/]{3,30}$/i.test(url)
      ? { valid: true, url, kind: 'tel' }
      : fail(url, 'Ungültige Telefonnummer. Format: tel:+4930123456');
  }
  if (protocol !== 'http' && protocol !== 'https') {
    return fail(url, `Das Protokoll „${protocol}:“ ist nicht erlaubt. Erlaubt sind https:, mailto:, tel: und Links, die mit / beginnen.`);
  }

  const parsed = parseHttp(url);
  if (!parsed) { return fail(url, 'Ungültige Webadresse.'); }
  if (parsed.hasUserInfo) { return fail(url, 'Links mit Benutzername oder Passwort (…@) sind nicht erlaubt.'); }
  if (parsed.hostname.length > MAX_HOST_LENGTH) { return fail(url, `Der Domainname ist zu lang (max. ${MAX_HOST_LENGTH} Zeichen).`); }

  const internal = parsed.hostname === policy.currentHost;
  if (internal) {
    const tooLong = pathError(url.substr(url.indexOf(parsed.hostname) + parsed.hostname.length).replace(/^:\d+/, ''), policy);
    if (tooLong) { return fail(url, tooLong); }
  }
  let warning: string | undefined;
  if (parsed.protocol === 'http' && !internal) {
    if (policy.httpsOnly) {
      return fail(url, 'Unverschlüsselte http-Links auf externe Seiten sind nicht erlaubt.', 'https' + url.substr(4));
    }
    warning = 'Unverschlüsselte Verbindung (http).';
  }
  if (!internal && policy.allowedLinkDomains.length > 0 &&
    !policy.allowedLinkDomains.some((d: string) => hostMatches(parsed.hostname, d))) {
    return fail(url, `Die Domain „${parsed.hostname}“ ist nicht freigegeben. Erlaubt: ${policy.allowedLinkDomains.join(', ')}.`);
  }
  return { valid: true, url, kind: internal ? 'internal' : 'external', warning };
}

/** Prüft eine Bild-URL: serverrelativ oder https, standardmäßig nur vom eigenen Host. */
export function checkImageUrl(raw: string | undefined, policy: ISecurityPolicy): IUrlCheck {
  const url = (raw || '').trim();
  if (!url) { return fail(url, 'Bitte ein Bild auswählen.'); }
  const basic = basicError(url, policy.maxUrlLength);
  if (basic) { return fail(url, basic.error, basic.suggestion); }
  if (url.substr(0, 2) === '//') { return fail(url, 'Protokoll-relative URLs (//…) sind nicht erlaubt.', 'https:' + url); }
  if (url.charAt(0) === '/') {
    const tooLong = pathError(url, policy);
    return tooLong ? fail(url, tooLong) : { valid: true, url, kind: 'internal' };
  }

  const parsed = parseHttp(url);
  if (!parsed) {
    return LOOKS_LIKE_DOMAIN.test(url)
      ? fail(url, 'Bitte die Bild-URL vollständig mit https:// angeben.', 'https://' + url)
      : fail(url, 'Nur https://-Adressen oder serverrelative Pfade (/sites/…) sind erlaubt.');
  }
  if (parsed.hasUserInfo) { return fail(url, 'URLs mit Benutzername oder Passwort sind nicht erlaubt.'); }
  if (parsed.hostname.length > MAX_HOST_LENGTH) { return fail(url, `Der Domainname ist zu lang (max. ${MAX_HOST_LENGTH} Zeichen).`); }
  const internal = parsed.hostname === policy.currentHost;
  if (parsed.protocol === 'http' && !internal) {
    return fail(url, 'Bilder müssen über https geladen werden.', 'https' + url.substr(4));
  }
  if (!internal && policy.imagesSameHostOnly &&
    !policy.allowedImageHosts.some((d: string) => hostMatches(parsed.hostname, d))) {
    return fail(url, 'Aus Sicherheitsgründen sind nur Bilder aus diesem SharePoint erlaubt. Bitte das Bild hochladen.');
  }
  return { valid: true, url, kind: internal ? 'internal' : 'external' };
}

/** Pfad relativ zur Website, ohne Pfadausbruch (..), Protokolle oder Sonderzeichen. Leerer String = gültig. */
export function validateFolderPath(value: string | undefined): string {
  const f = (value || '').trim();
  if (!f) { return 'Bitte einen Ordner angeben, z. B. SiteAssets.'; }
  if (f.charAt(0) === '/') { return 'Bitte einen Pfad relativ zur aktuellen Website angeben (ohne führenden /).'; }
  if (f.length > 200) { return 'Der Pfad ist zu lang (max. 200 Zeichen).'; }
  if (/\.\.|\/\/|[\\:*?"<>|#%~&{}\u0000-\u001f]/.test(f)) {
    return 'Der Pfad enthält unzulässige Zeichen oder Sequenzen (z. B. .., //, :, \\, #, %).';
  }
  return '';
}

export interface ITextCheck { error?: string; warning?: string; }

/**
 * Prüft Freitext (Titel, Tooltip, Alternativtext):
 * Länge, Steuerzeichen, unsichtbare Zeichen und die Sonderzeichen < > { } [ ] \ ` | ^ ~
 */
export function checkText(value: string | undefined, maxLength: number, required: boolean, requiredMessage: string): ITextCheck {
  const raw = value || '';
  const t = raw.trim();
  if (!t) { return required ? { error: requiredMessage } : {}; }
  if (raw.length > maxLength) { return { error: `Zu lang: ${raw.length} Zeichen, erlaubt sind maximal ${maxLength}.` }; }
  if (CONTROL_CHARS.test(raw) || /[\t\r\n]/.test(raw)) { return { error: 'Steuerzeichen (z. B. Tabulator oder Zeilenumbruch) sind nicht erlaubt.' }; }
  if (INVISIBLE_CHARS.test(raw)) { return { error: 'Enthält unsichtbare Zeichen (z. B. Textrichtungs-Umschaltung). Bitte neu eintippen statt kopieren.' }; }
  const forbidden = uniqueChars(raw, TEXT_FORBIDDEN);
  if (forbidden.length) { return { error: `Nicht erlaubte Sonderzeichen: ${quoteChars(forbidden)}.` }; }
  return {};
}

/** Entfernt alles, was checkText ablehnen würde (für die Anzeige von Altdaten). */
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
  const result = checkText(title, maxLength, true, 'Pflichtfeld: Der Titel ist der Linktext für Screenreader.');
  if (!result.error && GENERIC_LINK_TEXTS.indexOf((title || '').trim().toLowerCase()) >= 0) {
    return { warning: 'Bitte einen aussagekräftigen Linktext verwenden, der das Ziel beschreibt (WCAG 2.4.4).' };
  }
  return result;
}

export function checkTooltip(tooltip: string | undefined, maxLength: number): ITextCheck {
  return checkText(tooltip, maxLength, false, '');
}

export function checkAlt(alt: string | undefined, maxLength: number): string | undefined {
  return checkText(alt, maxLength, true, 'Der Alternativtext fehlt. Er beschreibt das Bild für Screenreader (WCAG 1.1.1).').error;
}

export interface IValidationIssue {
  areaId?: string;
  areaIndex?: number;
  field: 'alt' | 'url' | 'title' | 'tooltip';
  message: string;
}

/** Sammelt alle Fehler für die Übersicht im Editor. */
export function collectIssues(areas: IImageArea[], imageAlt: string, policy: ISecurityPolicy): IValidationIssue[] {
  const issues: IValidationIssue[] = [];
  const altError = checkAlt(imageAlt, policy.maxAltLength);
  if (altError) { issues.push({ field: 'alt', message: altError }); }
  areas.forEach((area: IImageArea, index: number) => {
    const link = checkLinkUrl(area.url, policy);
    if (!link.valid) {
      issues.push({ areaId: area.id, areaIndex: index, field: 'url', message: `Bereich ${index + 1}: ${link.error}` });
    }
    const title = checkTitle(area.title, policy.maxTitleLength);
    if (title.error) {
      issues.push({ areaId: area.id, areaIndex: index, field: 'title', message: `Bereich ${index + 1}, Titel: ${title.error}` });
    }
    const tooltip = checkTooltip(area.tooltip, policy.maxTooltipLength);
    if (tooltip.error) {
      issues.push({ areaId: area.id, areaIndex: index, field: 'tooltip', message: `Bereich ${index + 1}, Tooltip: ${tooltip.error}` });
    }
  });
  return issues;
}
