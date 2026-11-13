import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import * as strings from 'ModernImageMapWebPartStrings';
import { logWarning } from '../utils/logging';
import { IUntyped, odataItems } from '../utils/untyped';

export interface IPageResult {
  title: string;
  /** Server-relative, URL-encoded path */
  url: string;
  fileName: string;
}

/** Template ID of the "Site Pages" library (language-independent) */
const SITE_PAGES_TEMPLATE = 119;

/** Searches the site pages of the current site by title. */
export class PageService {
  private listId: Promise<string | undefined> | undefined;

  constructor(private readonly httpClient: SPHttpClient, private readonly webAbsoluteUrl: string) { }

  public search(query: string): Promise<IPageResult[]> {
    return this.getListId().then((id: string | undefined) => {
      if (!id) { return []; }
      const q = (query || '').trim().substr(0, 100);
      const filter = q ? `&$filter=substringof('${encodeURIComponent(q.replace(/'/g, "''"))}',Title)` : '';
      const url = `${this.api()}/web/lists(guid'${id}')/items?$select=Title,FileRef,FileLeafRef&$orderby=Modified desc&$top=15${filter}`;
      return this.httpClient.get(url, SPHttpClient.configurations.v1)
        .then((r: SPHttpClientResponse) => {
          if (!r.ok) {
            logWarning('Page search failed with status ' + r.status);
            throw new Error(strings.pageSearchFailed);
          }
          return r.json();
        })
        .then((json: unknown) => {
          return odataItems(json)
            .filter((i: IUntyped) => typeof i.FileRef === 'string')
            .map((i: IUntyped) => ({
              title: String(i.Title || i.FileLeafRef || '').substr(0, 255),
              fileName: String(i.FileLeafRef || ''),
              url: encodeURI(String(i.FileRef))
            }));
        });
    });
  }

  private getListId(): Promise<string | undefined> {
    if (!this.listId) {
      const url = `${this.api()}/web/lists?$filter=BaseTemplate eq ${SITE_PAGES_TEMPLATE}&$select=Id&$top=1`;
      this.listId = this.httpClient.get(url, SPHttpClient.configurations.v1)
        .then((r: SPHttpClientResponse) => (r.ok ? r.json() : { value: [] }))
        .then((json: unknown) => {
          const lists = odataItems(json);
          const id = lists.length ? String(lists[0].Id) : undefined;
          return id && /^[0-9a-f-]{36}$/i.test(id) ? id : undefined;
        })
        .catch(() => undefined);
    }
    return this.listId;
  }

  private api(): string {
    return `${this.webAbsoluteUrl.replace(/\/+$/, '')}/_api`;
  }
}
