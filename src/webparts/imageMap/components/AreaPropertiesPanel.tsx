import * as React from 'react';
import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import { Pivot, PivotItem } from '@fluentui/react/lib/Pivot';
import { TextField } from '@fluentui/react/lib/TextField';
import { Toggle } from '@fluentui/react/lib/Toggle';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { ChoiceGroup, IChoiceGroupOption } from '@fluentui/react/lib/ChoiceGroup';
import { SpinButton } from '@fluentui/react/lib/SpinButton';
import { Separator } from '@fluentui/react/lib/Separator';
import { Stack } from '@fluentui/react/lib/Stack';
import { DefaultButton, PrimaryButton, ActionButton, IconButton } from '@fluentui/react/lib/Button';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Label } from '@fluentui/react/lib/Label';
import { Text } from '@fluentui/react/lib/Text';
import { getId, IRenderFunction } from '@fluentui/react/lib/Utilities';
import { IPivotItemProps } from '@fluentui/react/lib/Pivot';
import { ISecurityPolicy } from '../config/securityConfig';
import {
  AreaBorderStyle, AreaShape, DEFAULT_HOVER, HOVER_PRESETS, IHoverPreset, IHoverStyle, IImageArea, matchPreset
} from '../models/IImageMap';
import { circleFromWidth, normalizeRect, IRect } from '../utils/geometry';
import { checkLinkUrl, checkTitle, checkTooltip } from '../utils/validation';
import { getEditAreaClass, getHoverRawStyle, getVisibilityWarning } from '../utils/hoverStyles';
import { IPageResult, PageService } from '../services/PageService';
import { ColorField } from './ColorField';
import { PageSearch } from './PageSearch';
import { classNames } from './styles';

/** CSS-Klasse am Link-Eingabefeld, damit das Panel beim Öffnen dorthin fokussiert. */
export const FIRST_FIELD_CLASS = 'imagemap-first-field';

export type PropertiesTab = 'link' | 'style' | 'position';

export interface IAreaPropertiesFormProps {
  area: IImageArea;
  index: number;
  policy: ISecurityPolicy;
  pageService: PageService;
  /** Bildbreite / Bildhöhe, damit Kreise rund bleiben */
  imageRatio: number;
  tab: PropertiesTab;
  onTabChange: (tab: PropertiesTab) => void;
  /** coalesceKey fasst Tippen in einem Feld zu einem Rückgängig-Schritt zusammen */
  onChange: (changes: Partial<IImageArea>, label: string, coalesceKey?: string) => void;
  onApplyHoverToAll: (hover: IHoverStyle) => void;
  onSaveAsDefaultHover: (hover: IHoverStyle) => void;
  onAnnounce: (message: string) => void;
}

const SHAPE_OPTIONS: IChoiceGroupOption[] = [
  { key: 'rect', text: 'Rechteck' },
  { key: 'circle', text: 'Kreis (bleibt immer rund)' },
  { key: 'ellipse', text: 'Ellipse' }
];

const BORDER_STYLE_OPTIONS: IDropdownOption[] = [
  { key: 'solid', text: 'Durchgezogen' },
  { key: 'dashed', text: 'Gestrichelt' },
  { key: 'dotted', text: 'Gepunktet' },
  { key: 'double', text: 'Doppelt' }
];

const KIND_TEXT: { [key: string]: string } = {
  internal: 'Interner Link (dieser SharePoint).',
  external: 'Externer Link. Er wird mit rel="noopener noreferrer" geöffnet.',
  mailto: 'E-Mail-Link.',
  tel: 'Telefon-Link.',
  anchor: 'Sprungmarke auf dieser Seite.'
};

function counter(value: string | undefined, max: number): string {
  return `${(value || '').length} von ${max} Zeichen`;
}

/** Farbmuster einer Vorlage (rein visuell, für Screenreader ausgeblendet). */
function PresetSwatch(props: { hover: IHoverStyle }): JSX.Element {
  const s = getHoverRawStyle(props.hover, 'rect');
  return (
    <span
      aria-hidden={true}
      style={{
        display: 'inline-block', width: 36, height: 22, marginRight: 8, verticalAlign: 'middle', boxSizing: 'border-box',
        borderColor: s.borderColor as string, borderWidth: s.borderWidth as string, borderStyle: s.borderStyle as string,
        backgroundColor: s.backgroundColor as string, borderRadius: 3,
        boxShadow: 'inset 0 0 0 100px rgba(128,128,128,.15)'
      }}
    />
  );
}

/** Reiter-Beschriftung mit unsichtbarem Zusatz für Screenreader (Fluent übernimmt kein aria-label am Reiter). */
function tabWithHint(hint: string | undefined) {
  return hint
    ? (link?: IPivotItemProps, defaultRender?: IRenderFunction<IPivotItemProps>) => (
      <span>
        {defaultRender ? defaultRender(link) : null}
        <span className={classNames.srOnly}>, {hint}</span>
      </span>
    )
    : undefined;
}

/** Formular mit drei Reitern. Wird im Panel und im Vollbild (inline) verwendet. */
export const AreaPropertiesForm: React.FunctionComponent<IAreaPropertiesFormProps> = (props: IAreaPropertiesFormProps) => {
  const area = props.area;
  const hover: IHoverStyle = area.hover || DEFAULT_HOVER;
  const [searchOpen, setSearchOpen] = React.useState<boolean>(false);
  const searchButtonRef = React.useRef<HTMLButtonElement>(null);
  const ids = React.useRef({ presets: getId('imagemap-presets') });

  const [customize, setCustomize] = React.useState<boolean>(false);
  React.useEffect(() => { setSearchOpen(false); setCustomize(false); }, [area.id]);

  const link = checkLinkUrl(area.url, props.policy);
  const title = checkTitle(area.title, props.policy.maxTitleLength);
  const tooltip = checkTooltip(area.tooltip, props.policy.maxTooltipLength);
  const visibility = getVisibilityWarning(hover);
  const linkTabHasError = !link.valid || !!title.error || !!tooltip.error;
  const matched = matchPreset(hover);
  const preset = customize ? undefined : matched;

  const setHover = (changes: Partial<IHoverStyle>, label: string) =>
    props.onChange({ hover: { ...hover, ...changes } }, label, `hover-${area.id}-${Object.keys(changes).join()}`);

  const setRect = (key: keyof IRect, raw: string | undefined) => {
    const value = parseFloat((raw || '').replace(',', '.'));
    if (isNaN(value)) { return; }
    const rect: IRect = { x: area.x, y: area.y, width: area.width, height: area.height };
    rect[key] = value;
    props.onChange(area.shape === 'circle'
      ? circleFromWidth(rect.x, rect.y, rect.width, props.imageRatio)
      : normalizeRect(rect), 'Position geändert', `rect-${area.id}-${key}`);
  };

  const setShape = (shape: AreaShape) => {
    if (shape === 'circle') {
      const diameter = Math.min(area.width, area.height / props.imageRatio);
      props.onChange({ shape, ...circleFromWidth(area.x, area.y, diameter, props.imageRatio) }, 'Form geändert');
    } else {
      props.onChange({ shape }, 'Form geändert');
    }
  };

  const setInt = (raw: string | undefined, min: number, max: number, apply: (n: number) => void) => {
    const n = parseInt(raw || '', 10);
    if (!isNaN(n)) { apply(Math.max(min, Math.min(max, n))); }
  };

  const numberField = (label: string, value: number, min: number, max: number, step: number,
    onValue: (v: string | undefined) => void, suffix?: string) => (
    <SpinButton
      label={label}
      value={String(value)}
      min={min}
      max={max}
      step={step}
      onChange={(ev: React.SyntheticEvent<HTMLElement>, v?: string) => onValue(v)}
      incrementButtonAriaLabel={`${label} um ${step}${suffix || ''} erhöhen`}
      decrementButtonAriaLabel={`${label} um ${step}${suffix || ''} verringern`}
    />
  );

  const selectPage = (page: IPageResult) => {
    const changes: Partial<IImageArea> = { url: page.url };
    if (!(area.title || '').trim()) { changes.title = page.title; }
    props.onChange(changes, 'Seite als Ziel gewählt');
    setSearchOpen(false);
    props.onAnnounce(`Ziel gesetzt: ${page.title}.`);
    window.setTimeout(() => {
      const input = document.querySelector(`.${FIRST_FIELD_CLASS}`) as HTMLInputElement | null;
      if (input) { input.focus(); }
    }, 0);
  };

  const presetOptions: IChoiceGroupOption[] = HOVER_PRESETS.map((p: IHoverPreset): IChoiceGroupOption => ({
    key: p.key,
    text: p.name,
    ariaLabel: `${p.name}: ${p.description}`,
    onRenderLabel: (option?: IChoiceGroupOption) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', paddingLeft: 26 }}>
        <PresetSwatch hover={p.hover} />
        <span>
          <span style={{ display: 'block' }}>{option ? option.text : p.name}</span>
          <span style={{ display: 'block', fontSize: 12, color: '#605e5c' }}>{p.description}</span>
        </span>
      </span>
    )
  })).concat([{ key: 'custom', text: 'Eigener Stil', ariaLabel: 'Eigener Stil: Farben und Rahmen selbst festlegen' }]);

  return (
    <Pivot
      selectedKey={props.tab}
      onLinkClick={(item?: PivotItem) => item && props.onTabChange(item.props.itemKey as PropertiesTab)}
      aria-label="Eigenschaften des Bereichs"
      overflowBehavior="none"
    >
      <PivotItem
        headerText="Link"
        itemKey="link"
        itemIcon={linkTabHasError ? 'Warning' : undefined}
        onRenderItemLink={tabWithHint(linkTabHasError ? 'enthält Fehler' : undefined)}
      >
        <Stack tokens={{ childrenGap: 12 }} styles={{ root: { paddingTop: 12 } }}>
          <div>
            <Stack horizontal verticalAlign="end" tokens={{ childrenGap: 4 }}>
              <Stack.Item grow={1}>
                <TextField
                  label="Ziel (URL)"
                  required={true}
                  inputClassName={FIRST_FIELD_CLASS}
                  placeholder="/sites/intranet/SitePages/Seite.aspx"
                  value={area.url}
                  maxLength={props.policy.maxUrlLength}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, v?: string) =>
                    props.onChange({ url: v || '' }, 'Ziel geändert', `url-${area.id}`)}
                  errorMessage={link.error}
                  description={link.valid && link.kind ? KIND_TEXT[link.kind] : undefined}
                />
              </Stack.Item>
              <IconButton
                elementRef={searchButtonRef}
                iconProps={{ iconName: 'Search' }}
                title="Seite suchen"
                ariaLabel="Websiteseite suchen"
                aria-expanded={searchOpen}
                checked={searchOpen}
                onClick={() => setSearchOpen(!searchOpen)}
                styles={{ root: { marginBottom: link.error || (link.valid && link.kind) ? 22 : 0 } }}
              />
            </Stack>
            {searchOpen && (
              <div style={{ marginTop: 8 }}>
                <PageSearch
                  service={props.pageService}
                  onSelect={selectPage}
                  onClose={() => {
                    setSearchOpen(false);
                    if (searchButtonRef.current) { searchButtonRef.current.focus(); }
                  }}
                />
              </div>
            )}
            {link.suggestion && (
              <ActionButton
                iconProps={{ iconName: 'AutoEnhanceOn' }}
                text={`Korrigieren zu ${link.suggestion}`}
                onClick={() => props.onChange({ url: link.suggestion || '' }, 'Ziel korrigiert')}
              />
            )}
            {link.warning && <MessageBar messageBarType={MessageBarType.warning}>{link.warning}</MessageBar>}
          </div>

          <TextField
            label="Titel (Linktext)"
            required={true}
            maxLength={props.policy.maxTitleLength}
            value={area.title}
            onChange={(e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, v?: string) =>
              props.onChange({ title: v || '' }, 'Titel geändert', `title-${area.id}`)}
            errorMessage={title.error}
            description={title.error ? undefined :
              `${counter(area.title, props.policy.maxTitleLength)}. Wird von Screenreadern als Linktext vorgelesen.`}
          />
          {title.warning && <MessageBar messageBarType={MessageBarType.warning}>{title.warning}</MessageBar>}

          <TextField
            label="Tooltip (optional)"
            multiline={true}
            autoAdjustHeight={true}
            rows={2}
            maxLength={props.policy.maxTooltipLength}
            value={area.tooltip || ''}
            onChange={(e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, v?: string) =>
              props.onChange({ tooltip: (v || '').replace(/[\r\n]+/g, ' ') }, 'Tooltip geändert', `tooltip-${area.id}`)}
            errorMessage={tooltip.error}
            description={tooltip.error ? undefined :
              `${counter(area.tooltip, props.policy.maxTooltipLength)}. Leer = Titel wird angezeigt.`}
          />

          <Toggle
            label="In neuem Tab öffnen"
            checked={area.openInNewTab}
            onText="Ja"
            offText="Nein"
            onChange={(e: React.MouseEvent<HTMLElement>, checked?: boolean) =>
              props.onChange({ openInNewTab: !!checked }, checked ? 'Neuer Tab aktiviert' : 'Neuer Tab deaktiviert')}
          />
        </Stack>
      </PivotItem>

      <PivotItem
        headerText="Stil"
        itemKey="style"
        itemIcon={visibility ? 'Warning' : undefined}
        onRenderItemLink={tabWithHint(visibility ? 'schlecht erkennbar' : undefined)}
      >
        <Stack tokens={{ childrenGap: 12 }} styles={{ root: { paddingTop: 12 } }}>
          <ChoiceGroup
            label="Form"
            selectedKey={area.shape}
            options={SHAPE_OPTIONS}
            onChange={(e?: React.FormEvent<HTMLElement | HTMLInputElement>, o?: IChoiceGroupOption) => o && setShape(o.key as AreaShape)}
          />
          <ChoiceGroup
            id={ids.current.presets}
            label="Darstellung bei Hover und Tastaturfokus"
            selectedKey={preset || 'custom'}
            options={presetOptions}
            onChange={(e?: React.FormEvent<HTMLElement | HTMLInputElement>, o?: IChoiceGroupOption) => {
              if (!o) { return; }
              if (o.key === 'custom') {
                setCustomize(true);
                props.onAnnounce('Eigener Stil: Die Einstellungen für Rahmen und Füllung folgen unterhalb.');
                return;
              }
              setCustomize(false);
              const p = HOVER_PRESETS.filter((x: IHoverPreset) => x.key === o.key)[0];
              if (p) { props.onChange({ hover: { ...p.hover } }, `Stil „${p.name}“ gewählt`); }
            }}
          />

          {!preset && (
            <Stack tokens={{ childrenGap: 12 }}>
              <ColorField label="Rahmenfarbe" value={hover.borderColor} fallback={DEFAULT_HOVER.borderColor} allowAlpha={true}
                onChange={(v: string) => setHover({ borderColor: v }, 'Rahmenfarbe geändert')} />
              {numberField('Rahmendicke in Pixel', hover.borderWidth, 0, 20, 1,
                (v?: string) => setInt(v, 0, 20, (n: number) => setHover({ borderWidth: n }, 'Rahmendicke geändert')), ' px')}
              <Dropdown label="Rahmenstil" selectedKey={hover.borderStyle} options={BORDER_STYLE_OPTIONS}
                onChange={(e: React.FormEvent<HTMLDivElement>, o?: IDropdownOption) => o && setHover({ borderStyle: o.key as AreaBorderStyle }, 'Rahmenstil geändert')} />
              <ColorField label="Füllfarbe (mit Transparenz)" value={hover.fillColor} fallback="rgba(0, 0, 0, 0)" allowAlpha={true}
                onChange={(v: string) => setHover({ fillColor: v }, 'Füllfarbe geändert')} />
              {area.shape === 'rect' && numberField('Eckenradius in Pixel', hover.borderRadius, 0, 200, 1,
                (v?: string) => setInt(v, 0, 200, (n: number) => setHover({ borderRadius: n }, 'Eckenradius geändert')), ' px')}
            </Stack>
          )}

          {visibility && <MessageBar messageBarType={MessageBarType.warning}>{visibility}</MessageBar>}

          <div>
            <Label id="imagemap-preview-label">Vorschau</Label>
            <div className={classNames.previewStage} role="img" aria-labelledby="imagemap-preview-label">
              <div className={`${classNames.previewBox} ${getEditAreaClass(area)}`}
                style={area.shape === 'circle' ? { left: '50%', width: 60, marginLeft: -30 } : undefined} />
            </div>
            <Text variant="small" block={true} style={{ marginTop: 4 }}>
              Bei Tastaturfokus erscheint zusätzlich ein schwarz-weißer Fokusrahmen.
            </Text>
          </div>

          <Stack horizontal wrap tokens={{ childrenGap: 4 }}>
            <ActionButton iconProps={{ iconName: 'Copy' }} text="Auf alle Bereiche anwenden" onClick={() => props.onApplyHoverToAll(hover)} />
            <ActionButton iconProps={{ iconName: 'Save' }} text="Als Standard für neue Bereiche" onClick={() => props.onSaveAsDefaultHover(hover)} />
          </Stack>
        </Stack>
      </PivotItem>

      <PivotItem headerText="Position" itemKey="position">
        <Stack tokens={{ childrenGap: 12 }} styles={{ root: { paddingTop: 12 } }}>
          <Text variant="small">Angaben in Prozent des Bildes. Auf der Zeichenfläche: Pfeiltasten verschieben, Strg + Pfeiltasten ändern die Größe.</Text>
          <Stack horizontal tokens={{ childrenGap: 8 }}>
            <Stack.Item grow={1}>{numberField('Abstand links', area.x, 0, 100, 0.5, (v?: string) => setRect('x', v), ' %')}</Stack.Item>
            <Stack.Item grow={1}>{numberField('Abstand oben', area.y, 0, 100, 0.5, (v?: string) => setRect('y', v), ' %')}</Stack.Item>
          </Stack>
          {area.shape === 'circle' ? (
            numberField('Durchmesser (% der Bildbreite)', area.width, 1, 100, 0.5, (v?: string) => setRect('width', v), ' %')
          ) : (
            <Stack horizontal tokens={{ childrenGap: 8 }}>
              <Stack.Item grow={1}>{numberField('Breite', area.width, 1, 100, 0.5, (v?: string) => setRect('width', v), ' %')}</Stack.Item>
              <Stack.Item grow={1}>{numberField('Höhe', area.height, 1, 100, 0.5, (v?: string) => setRect('height', v), ' %')}</Stack.Item>
            </Stack>
          )}
        </Stack>
      </PivotItem>
    </Pivot>
  );
};

export interface IAreaPropertiesPanelProps extends IAreaPropertiesFormProps {
  isOpen: boolean;
  onDelete: () => void;
  onDismiss: () => void;
  /** Nach dem Schließen (Fokus zurück an den Bereich) */
  onDismissed: () => void;
}

export const AreaPropertiesPanel: React.FunctionComponent<IAreaPropertiesPanelProps> = (props: IAreaPropertiesPanelProps) => {
  const footer = () => (
    <Stack horizontal tokens={{ childrenGap: 8 }}>
      <PrimaryButton text="Fertig" onClick={props.onDismiss} />
      <DefaultButton text="Bereich löschen" iconProps={{ iconName: 'Delete' }} onClick={props.onDelete} />
    </Stack>
  );
  return (
    <Panel
      isOpen={props.isOpen}
      type={PanelType.custom}
      customWidth="360px"
      isBlocking={false}
      headerText={`Bereich ${props.index + 1} bearbeiten`}
      closeButtonAriaLabel="Eigenschaften schließen"
      onDismiss={props.onDismiss}
      onDismissed={props.onDismissed}
      onRenderFooterContent={footer}
      isFooterAtBottom={true}
      focusTrapZoneProps={{ firstFocusableSelector: FIRST_FIELD_CLASS }}
    >
      <AreaPropertiesForm {...props} />
    </Panel>
  );
};

/** Variante für das Vollbild: als Spalte neben der Zeichenfläche. */
export const AreaPropertiesInline: React.FunctionComponent<IAreaPropertiesFormProps & { onDelete: () => void; onClose: () => void }> =
  (props: IAreaPropertiesFormProps & { onDelete: () => void; onClose: () => void }) => (
    <section aria-label={`Eigenschaften von Bereich ${props.index + 1}`} style={{ padding: '8px 16px' }}>
      <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
        <Text variant="large" as="h2" style={{ margin: 0 }}>Bereich {props.index + 1}</Text>
        <Stack horizontal>
          <IconButton iconProps={{ iconName: 'Delete' }} title="Bereich löschen" ariaLabel={`Bereich ${props.index + 1} löschen`} onClick={props.onDelete} />
          <IconButton iconProps={{ iconName: 'Cancel' }} title="Eigenschaften schließen" ariaLabel="Eigenschaften schließen" onClick={props.onClose} />
        </Stack>
      </Stack>
      <Separator />
      <AreaPropertiesForm {...props} />
    </section>
  );
