import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import * as strings from 'ImageMapWebPartStrings';

export interface IImageFile {
  name: string;
  serverRelativeUrl: string;
  modified: string;
}

/** Error with HTTP status. The message is user-friendly and contains no server details. */
export interface IServiceError extends Error {
  status?: number;
}

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|bmp)$/i;

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
    const clean = (folder || 'SiteAssets').trim().replace(/^\/+|\/+$/g, '');
    const base = this.webServerRelativeUrl === '/' ? '' : this.webServerRelativeUrl.replace(/\/+$/, '');
    return `${base}/${clean}`;
  }

  public folderExists(folder: string): Promise<boolean> {
    const url = `${this.api()}/web/GetFolderByServerRelativeUrl(@f)?@f=${odataLiteral(this.resolveFolder(folder))}&$select=Exists`;
    return this.httpClient.get(url, SPHttpClient.configurations.v1)
      .then((response: SPHttpClientResponse) => {
        if (!response.ok) { return false; }
        return response.json().then((json: any) => {
          const data = json.d || json;
          return data.Exists !== false;
        });
      })
      .catch(() => false);
  }

  public getImages(folder: string): Promise<IImageFile[]> {
    const url = `${this.api()}/web/GetFolderByServerRelativeUrl(@f)/Files` +
      `?@f=${odataLiteral(this.resolveFolder(folder))}&$select=Name,ServerRelativeUrl,TimeLastModified`;

    return this.httpClient.get(url, SPHttpClient.configurations.v1)
      .then(readJson)
      .then((json: any) => {
        const items: any[] = json.value || (json.d && json.d.results) || [];
        return items
          .filter((i: any) => typeof i.Name === 'string' && IMAGE_EXTENSIONS.test(i.Name) && typeof i.ServerRelativeUrl === 'string')
          .map(mapFile)
          .sort((a: IImageFile, b: IImageFile) => (a.modified < b.modified ? 1 : -1));
      });
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
      .then((json: any) => mapFile(json.d || json));
  }

  private api(): string {
    return `${this.webAbsoluteUrl.replace(/\/+$/, '')}/_api`;
  }
}

function odataLiteral(value: string): string {
  return `'${encodeURIComponent(value.replace(/'/g, "''"))}'`;
}

function mapFile(item: any): IImageFile {
  return {
    name: String(item.Name || ''),
    serverRelativeUrl: String(item.ServerRelativeUrl || ''),
    modified: String(item.TimeLastModified || '')
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

function readJson(response: SPHttpClientResponse): Promise<any> {
  if (response.ok) {
    return response.json();
  }
  return response.text().then((text: string) => {
    // Technical details only in the console, not in the UI
    // tslint:disable-next-line:no-console
    console.error('[ImageMap] SharePoint error', response.status, text);
    const error: IServiceError = new Error(friendlyMessage(response.status));
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
