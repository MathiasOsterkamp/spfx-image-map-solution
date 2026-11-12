import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import * as strings from 'ImageMapWebPartStrings';
import { asRecord, IUntyped, odataEntity, odataItems } from '../utils/untyped';

export interface IImageFile {
  name: string;
  /** Percent-encoded, can be used directly as a URL */
  serverRelativeUrl: string;
}

export interface IImageFolder {
  name: string;
}

/** One page of images. "next" is the paging token for the following page (undefined = end reached). */
export interface IImagePage {
  images: IImageFile[];
  next?: string;
}

/** Error with HTTP status. The message is user-friendly and contains no server details. */
export interface IServiceError extends Error {
  status?: number;
}

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|bmp)$/i;
/** Rows requested from SharePoint per request (folders and non-image files are filtered out afterwards). */
const PAGE_SIZE = 60;
/** A page is filled up with further requests until it has at least this many images … */
const MIN_IMAGES_PER_PAGE = 24;
/** … but with at most this many requests per page. */
const MAX_REQUESTS_PER_PAGE = 5;
/** Technical subfolders that are not shown. */
const HIDDEN_FOLDERS = /^(_.*|Forms)$/i;

/**
 * Loads images from a library folder of the CURRENT site and uploads new images.
 * Uses only the SharePoint REST API via SPHttpClient (request digest is set automatically).
 * Permissions are checked by SharePoint on the server. The web part cannot bypass them.
 */
export class ImageService {
  constructor(
    private readonly httpClient: SPHttpClient,
    private readonly webAbsoluteUrl: string,
    private readonly webServerRelativeUrl: string
  ) { }

  /** "SiteAssets/Bilder" → "/sites/xyz/SiteAssets/Bilder". Only paths within the current site. */
  public resolveFolder(folder: string): string {
    const base = this.webServerRelativeUrl === '/' ? '' : this.webServerRelativeUrl.replace(/\/+$/, '');
    return `${base}/${cleanFolder(folder)}`;
  }

  /** Configured folder plus the subfolders the user navigated into. */
  public resolvePath(folder: string, subFolders: string[]): string {
    return [this.resolveFolder(folder)].concat(subFolders).join('/');
  }

  public folderExists(folder: string): Promise<boolean> {
    const url = `${this.api()}/web/GetFolderByServerRelativeUrl(@f)?@f=${odataLiteral(this.resolveFolder(folder))}&$select=Exists`;
    return this.httpClient.get(url, SPHttpClient.configurations.v1)
      .then((response: SPHttpClientResponse) => {
        if (!response.ok) { return false; }
        return response.json().then((json: unknown) => odataEntity(json).Exists !== false);
      })
      .catch(() => false);
  }

  /** Subfolders of a folder, sorted by name. */
  public getFolders(folder: string, subFolders: string[]): Promise<IImageFolder[]> {
    const url = `${this.api()}/web/GetFolderByServerRelativeUrl(@f)/Folders` +
      `?@f=${odataLiteral(this.resolvePath(folder, subFolders))}&$select=Name&$orderby=Name`;

    return this.httpClient.get(url, SPHttpClient.configurations.v1)
      .then(readJson)
      .then((json: unknown) => {
        const folders: IImageFolder[] = [];
        odataItems(json).forEach((i: IUntyped) => {
          if (typeof i.Name === 'string' && !HIDDEN_FOLDERS.test(i.Name)) {
            folders.push({ name: i.Name });
          }
        });
        return folders;
      });
  }

  /**
   * Loads one page of images of a folder (newest first), optionally filtered by file name.
   * Paging and filtering are done by SharePoint, so folders with many thousand files work as well.
   * @param next Paging token of the previous page (IImagePage.next)
   */
  public getImagePage(folder: string, subFolders: string[], query: string, next?: string): Promise<IImagePage> {
    // The library is the first segment of the configured folder ("SiteAssets/Bilder" → "SiteAssets").
    const library = this.resolveFolder(cleanFolder(folder).split('/')[0]);
    const path = this.resolvePath(folder, subFolders);
    const images: IImageFile[] = [];

    const load = (paging: string | undefined, request: number): Promise<IImagePage> =>
      this.renderList(library, path, query, paging).then((data: IUntyped) => {
        const rows: unknown[] = Array.isArray(data.Row) ? data.Row : [];
        rows.forEach((row: unknown) => {
          const r = asRecord(row);
          if (String(r.FSObjType) !== '1' && typeof r.FileRef === 'string' &&
            typeof r.FileLeafRef === 'string' && IMAGE_EXTENSIONS.test(r.FileLeafRef)) {
            images.push({ name: r.FileLeafRef, serverRelativeUrl: encodeServerRelativeUrl(r.FileRef) });
          }
        });
        const nextPaging = typeof data.NextHref === 'string' && data.NextHref
          ? data.NextHref.replace(/^\?/, '')
          : undefined;
        if (nextPaging && images.length < MIN_IMAGES_PER_PAGE && request < MAX_REQUESTS_PER_PAGE) {
          return load(nextPaging, request + 1);
        }
        return { images, next: nextPaging };
      });

    return load(next, 1);
  }

  /**
   * Uploads a file (previously checked with validateImageFile). Never overwrites:
   * If the name is taken, a timestamp is appended.
   */
  public upload(folder: string, file: File, fileName: string): Promise<IImageFile> {
    const path = this.resolveFolder(folder);
    return readAsArrayBuffer(file).then((buffer: ArrayBuffer) =>
      this.addFile(path, fileName, buffer).catch((e: IServiceError) => {
        if (e.status && [401, 403, 404, 413, 429, 503].indexOf(e.status) >= 0) {
          throw e;
        }
        return this.addFile(path, makeUnique(fileName), buffer);
      })
    );
  }

  private addFile(folderPath: string, name: string, buffer: ArrayBuffer): Promise<IImageFile> {
    const url = `${this.api()}/web/GetFolderByServerRelativeUrl(@f)/Files/add(url=@n,overwrite=false)` +
      `?@f=${odataLiteral(folderPath)}&@n=${odataLiteral(name)}`;
    return this.httpClient.post(url, SPHttpClient.configurations.v1, { body: buffer })
      .then(readJson)
      .then((json: unknown) => mapFile(odataEntity(json)));
  }

  /** One page of list rows of a folder via RenderListDataAsStream (server-side paging and filtering). */
  private renderList(library: string, folderPath: string, query: string, paging: string | undefined): Promise<IUntyped> {
    const url = `${this.api()}/web/GetList(@l)/RenderListDataAsStream?@l=${odataLiteral(library)}`;
    const q = (query || '').trim().substr(0, 100);
    const where = q
      ? `<Where><Contains><FieldRef Name="FileLeafRef"/><Value Type="Text">${escapeXml(q)}</Value></Contains></Where>`
      : '';
    // Sorted by ID: indexed, therefore also allowed in folders above the list view threshold.
    const viewXml = `<View><Query>${where}<OrderBy><FieldRef Name="ID" Ascending="FALSE"/></OrderBy></Query>` +
      '<ViewFields><FieldRef Name="FileLeafRef"/><FieldRef Name="FileRef"/><FieldRef Name="FSObjType"/></ViewFields>' +
      `<RowLimit Paged="TRUE">${PAGE_SIZE}</RowLimit></View>`;
    const parameters: IUntyped = { RenderOptions: 2, ViewXml: viewXml, FolderServerRelativeUrl: folderPath };
    if (paging) { parameters.Paging = paging; }

    return this.httpClient.post(url, SPHttpClient.configurations.v1, {
      headers: { 'Content-Type': 'application/json;charset=utf-8' },
      body: JSON.stringify({ parameters })
    })
      .then(readJson)
      .then((json: unknown) => odataEntity(json));
  }

  private api(): string {
    return `${this.webAbsoluteUrl.replace(/\/+$/, '')}/_api`;
  }
}

function cleanFolder(folder: string): string {
  return (folder || 'SiteAssets').trim().replace(/^\/+|\/+$/g, '');
}

function odataLiteral(value: string): string {
  return `'${encodeURIComponent(value.replace(/'/g, "''"))}'`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * SharePoint returns ServerRelativeUrl decoded ("/sites/x/SiteAssets/my image.png").
 * Encodes each path segment so that spaces, #, % etc. yield a valid URL.
 */
export function encodeServerRelativeUrl(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

/** Compares two image URLs regardless of their percent encoding. */
export function isSameImageUrl(a: string, b: string): boolean {
  const decode = (value: string) => {
    try {
      return decodeURIComponent(value || '');
    } catch (e) {
      return value || '';
    }
  };
  return decode(a) === decode(b);
}

function mapFile(item: IUntyped): IImageFile {
  return {
    name: String(item.Name || ''),
    serverRelativeUrl: encodeServerRelativeUrl(String(item.ServerRelativeUrl || ''))
  };
}

function friendlyMessage(status: number): string {
  switch (status) {
    case 400: return strings.httpBadRequest;
    case 401:
    case 403: return strings.httpForbidden;
    case 404: return strings.httpNotFound;
    case 409: return strings.httpConflict;
    case 413: return strings.httpTooLarge;
    case 423: return strings.httpLocked;
    case 429:
    case 503: return strings.httpBusy;
    default: return strings.httpError(status);
  }
}

function readJson(response: SPHttpClientResponse): Promise<unknown> {
  if (response.ok) {
    return response.json();
  }
  return response.text().then((text: string) => {
    // Technical details only in the console, not in the UI
    // tslint:disable-next-line:no-console
    console.error('[ImageMap] SharePoint error', response.status, text);
    // List view threshold exceeded (SPQueryThrottledException)
    const throttled = /SPQueryThrottledException|-2147024860/.test(text);
    const error: IServiceError = new Error(throttled ? strings.listTooLarge : friendlyMessage(response.status));
    error.status = response.status;
    throw error;
  });
}

function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error(strings.fileReadFailed));
    reader.readAsArrayBuffer(file);
  });
}

function makeUnique(name: string): string {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? '0' : '') + n;
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const dot = name.lastIndexOf('.');
  return dot > 0 ? `${name.substr(0, dot)}-${stamp}${name.substr(dot)}` : `${name}-${stamp}`;
}
