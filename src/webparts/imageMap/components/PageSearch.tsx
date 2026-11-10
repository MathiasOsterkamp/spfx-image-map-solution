import * as React from 'react';
import { SearchBox } from '@fluentui/react/lib/SearchBox';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Icon } from '@fluentui/react/lib/Icon';
import { getId } from '@fluentui/react/lib/Utilities';
import { getTheme, mergeStyleSets } from '@fluentui/react/lib/Styling';
import { IPageResult, PageService } from '../services/PageService';

const theme = getTheme();
const css = mergeStyleSets({
  list: { listStyle: 'none', margin: '4px 0 0', padding: 0, border: `1px solid ${theme.palette.neutralLight}`, borderRadius: 2, maxHeight: 220, overflowY: 'auto' },
  item: {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%', minHeight: 32, padding: '4px 8px',
    border: 'none', background: 'transparent', textAlign: 'left', font: 'inherit', cursor: 'pointer', color: theme.palette.neutralPrimary,
    selectors: {
      ':hover': { background: theme.palette.neutralLighter },
      ':focus': { outline: `2px solid ${theme.palette.neutralPrimary}`, outlineOffset: -2 }
    }
  },
  title: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  file: { color: theme.palette.neutralSecondary, fontSize: 12 },
  status: { fontSize: 12, color: theme.palette.neutralSecondary, marginTop: 4 }
});

export interface IPageSearchProps {
  service: PageService;
  onSelect: (page: IPageResult) => void;
  onClose: () => void;
}

/**
 * Suche in den Websiteseiten. Tastatur: Eingabe filtert, Pfeil runter springt in die Ergebnisse,
 * Pfeil hoch/runter wechselt, Enter wählt, Esc schließt. Die Trefferzahl wird angesagt.
 */
export const PageSearch: React.FunctionComponent<IPageSearchProps> = (props: IPageSearchProps) => {
  const [query, setQuery] = React.useState<string>('');
  const [results, setResults] = React.useState<IPageResult[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const listRef = React.useRef<HTMLUListElement>(null);
  const ids = React.useRef({ list: getId('imagemap-pages'), status: getId('imagemap-pages-status') });
  const request = React.useRef<number>(0);

  React.useEffect(() => {
    const id = ++request.current;
    setLoading(true);
    const timer = window.setTimeout(() => {
      props.service.search(query)
        .then((r: IPageResult[]) => { if (id === request.current) { setResults(r); setError(undefined); } })
        .catch((e: Error) => { if (id === request.current) { setResults([]); setError(e.message); } })
        .then(() => { if (id === request.current) { setLoading(false); } });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const focusResult = (index: number) => {
    const buttons = listRef.current ? listRef.current.querySelectorAll('button') : undefined;
    if (buttons && buttons.length) {
      (buttons[Math.max(0, Math.min(buttons.length - 1, index))] as HTMLButtonElement).focus();
    }
  };

  const onListKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    const buttons = listRef.current ? Array.prototype.slice.call(listRef.current.querySelectorAll('button')) : [];
    const index = buttons.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'Down') { e.preventDefault(); focusResult(index + 1); }
    if (e.key === 'ArrowUp' || e.key === 'Up') { e.preventDefault(); focusResult(index - 1); }
    if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); e.stopPropagation(); props.onClose(); }
  };

  const status = loading ? 'Suche läuft …'
    : error ? error
      : results.length === 0 ? 'Keine Seiten gefunden.'
        : `${results.length} ${results.length === 1 ? 'Seite' : 'Seiten'} gefunden. Mit Pfeil runter zu den Ergebnissen.`;

  return (
    <div>
      <SearchBox
        placeholder="Seitentitel eingeben"
        ariaLabel="Websiteseiten durchsuchen"
        aria-controls={ids.current.list}
        aria-describedby={ids.current.status}
        value={query}
        autoFocus={true}
        onChange={(e?: React.ChangeEvent<HTMLInputElement>, v?: string) => setQuery(v || '')}
        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'ArrowDown' || e.key === 'Down') { e.preventDefault(); focusResult(0); }
        }}
        onEscape={() => props.onClose()}
        onSearch={() => focusResult(0)}
      />
      <div id={ids.current.status} className={css.status} role="status" aria-live="polite">
        {loading ? <Spinner size={SpinnerSize.xSmall} label="Suche läuft …" labelPosition="right" /> : status}
      </div>
      {!loading && results.length > 0 && (
        <ul id={ids.current.list} ref={listRef} className={css.list} aria-label="Gefundene Seiten" onKeyDown={onListKeyDown}>
          {results.map((page: IPageResult) => (
            <li key={page.url}>
              <button type="button" className={css.item} onClick={() => props.onSelect(page)}>
                <Icon iconName="Page" aria-hidden={true} />
                <span className={css.title}>{page.title}</span>
                <span className={css.file} aria-hidden={true}>{page.fileName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
