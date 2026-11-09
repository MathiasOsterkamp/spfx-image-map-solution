import * as React from 'react';
import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import { TextField } from '@fluentui/react/lib/TextField';
import { Toggle } from '@fluentui/react/lib/Toggle';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { ChoiceGroup, IChoiceGroupOption } from '@fluentui/react/lib/ChoiceGroup';
import { SpinButton } from '@fluentui/react/lib/SpinButton';
import { Separator } from '@fluentui/react/lib/Separator';
import { Stack } from '@fluentui/react/lib/Stack';
import { DefaultButton, PrimaryButton, ActionButton } from '@fluentui/react/lib/Button';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Label } from '@fluentui/react/lib/Label';
import { ISecurityPolicy } from '../config/securityConfig';
import { AreaBorderStyle, AreaShape, DEFAULT_HOVER, IHoverStyle, IImageArea } from '../models/IImageMap';
import { circleFromWidth, normalizeRect, IRect } from '../utils/geometry';
import { checkLinkUrl, checkTitle, checkTooltip } from '../utils/validation';
import { getEditAreaClass, getVisibilityWarning } from '../utils/hoverStyles';
import { ColorField } from './ColorField';
import { classNames } from './styles';

/** CSS-Klasse am Link-Eingabefeld, damit das Panel beim Öffnen dorthin fokussiert. */
const FIRST_FIELD_CLASS = 'imagemap-first-field';

export interface IAreaPropertiesPanelProps {
  isOpen: boolean;
  area?: IImageArea;
  index: number;
  policy: ISecurityPolicy;
  /** Bildbreite / Bildhöhe, damit Kreise rund bleiben */
  imageRatio: number;
  onChange: (changes: Partial<IImageArea>) => void;
  onDelete: () => void;
  onDismiss: () => void;
  /** Nach dem Schließen (Fokus zurück an den Bereich) */
  onDismissed: () => void;
  onApplyHoverToAll: (hover: IHoverStyle) => void;
  onSaveAsDefaultHover: (hover: IHoverStyle) => void;
}

const SHAPE_OPTIONS: IChoiceGroupOption[] = [
  { key: 'rect', text: 'Rechteck' },
  { key: 'circle', text: 'Kreis (bleibt immer rund)' },
  { key: 'ellipse', text: 'Ellipse' }
];

function counter(value: string | undefined, max: number): string {
  return `${(value || '').length} von ${max} Zeichen`;
}

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

export const AreaPropertiesPanel: React.FunctionComponent<IAreaPropertiesPanelProps> = (props: IAreaPropertiesPanelProps) => {
  const area = props.area;
  const hover: IHoverStyle = (area && area.hover) || DEFAULT_HOVER;

  const setHover = (changes: Partial<IHoverStyle>) => props.onChange({ hover: { ...hover, ...changes } });

  const setRect = (key: keyof IRect, raw: string | undefined) => {
    if (!area) { return; }
    const value = parseFloat((raw || '').replace(',', '.'));
    if (isNaN(value)) { return; }
    const rect: IRect = { x: area.x, y: area.y, width: area.width, height: area.height };
    rect[key] = value;
    props.onChange(area.shape === 'circle'
      ? circleFromWidth(rect.x, rect.y, rect.width, props.imageRatio)
      : normalizeRect(rect));
  };

  const setShape = (shape: AreaShape) => {
    if (!area) { return; }
    if (shape === 'circle') {
      // Durchmesser = kleinere Seite des bisherigen Bereichs (in Pixeln), damit nichts übersteht
      const diameter = Math.min(area.width, area.height / props.imageRatio);
      props.onChange({ shape, ...circleFromWidth(area.x, area.y, diameter, props.imageRatio) });
    } else {
      props.onChange({ shape });
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

  const link = area ? checkLinkUrl(area.url, props.policy) : undefined;
  const title = area ? checkTitle(area.title, props.policy.maxTitleLength) : {};
  const tooltip = area ? checkTooltip(area.tooltip, props.policy.maxTooltipLength) : {};
  const visibility = getVisibilityWarning(hover);

  const footer = () => (
    <Stack horizontal tokens={{ childrenGap: 8 }}>
      <PrimaryButton text="Fertig" onClick={props.onDismiss} />
      <DefaultButton text="Bereich löschen" iconProps={{ iconName: 'Delete' }} onClick={props.onDelete} />
    </Stack>
  );

  return (
    <Panel
      isOpen={props.isOpen && !!area}
      type={PanelType.smallFixedFar}
      isBlocking={false}
      headerText={`Bereich ${props.index + 1} bearbeiten`}
      closeButtonAriaLabel="Eigenschaften schließen"
      onDismiss={props.onDismiss}
      onDismissed={props.onDismissed}
      onRenderFooterContent={footer}
      isFooterAtBottom={true}
      focusTrapZoneProps={{ firstFocusableSelector: FIRST_FIELD_CLASS }}
    >
      {area && link && (
        <Stack tokens={{ childrenGap: 12 }}>
          <div>
            <TextField
              label="Link (URL)"
              required={true}
              inputClassName={FIRST_FIELD_CLASS}
              placeholder="https://www.firma.de oder /sites/intranet/SitePages/Seite.aspx"
              value={area.url}
              maxLength={props.policy.maxUrlLength}
              autoComplete="off"
              spellCheck={false}
              onChange={(e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, v?: string) => props.onChange({ url: v || '' })}
              errorMessage={link.error}
              description={link.valid && link.kind ? KIND_TEXT[link.kind] : undefined}
            />
            {link.suggestion && (
              <ActionButton
                iconProps={{ iconName: 'AutoEnhanceOn' }}
                text={`Korrigieren zu ${link.suggestion}`}
                onClick={() => props.onChange({ url: link.suggestion || '' })}
              />
            )}
            {link.warning && <MessageBar messageBarType={MessageBarType.warning}>{link.warning}</MessageBar>}
          </div>

          <Toggle
            label="In neuem Tab öffnen"
            checked={area.openInNewTab}
            onText="Ja"
            offText="Nein"
            onChange={(e: React.MouseEvent<HTMLElement>, checked?: boolean) => props.onChange({ openInNewTab: !!checked })}
          />

          <TextField
            label="Titel (Linktext)"
            required={true}
            maxLength={props.policy.maxTitleLength}
            value={area.title}
            onChange={(e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, v?: string) => props.onChange({ title: v || '' })}
            errorMessage={title.error}
            description={title.error ? undefined :
              `${counter(area.title, props.policy.maxTitleLength)}. Wird von Screenreadern als Linktext vorgelesen, z. B. „Kantine – Speiseplan“.`}
          />
          {title.warning && <MessageBar messageBarType={MessageBarType.warning}>{title.warning}</MessageBar>}

          <TextField
            label="Tooltip (optional)"
            multiline={true}
            autoAdjustHeight={true}
            rows={2}
            maxLength={props.policy.maxTooltipLength}
            value={area.tooltip || ''}
            onChange={(e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, v?: string) => props.onChange({ tooltip: (v || '').replace(/[\r\n]+/g, ' ') })}
            errorMessage={tooltip.error}
            description={tooltip.error ? undefined :
              `${counter(area.tooltip, props.policy.maxTooltipLength)}. Erscheint beim Überfahren. Leer = Titel wird angezeigt.`}
          />

          <ChoiceGroup
            label="Form"
            selectedKey={area.shape}
            options={SHAPE_OPTIONS}
            onChange={(e?: React.FormEvent<HTMLElement | HTMLInputElement>, o?: IChoiceGroupOption) => o && setShape(o.key as AreaShape)}
          />

          <Separator>Hover- und Fokus-Darstellung</Separator>

          <ColorField
            label="Rahmenfarbe"
            value={hover.borderColor}
            fallback={DEFAULT_HOVER.borderColor}
            allowAlpha={true}
            onChange={(v: string) => setHover({ borderColor: v })}
          />
          {numberField('Rahmendicke in Pixel', hover.borderWidth, 0, 20, 1,
            (v?: string) => setInt(v, 0, 20, (n: number) => setHover({ borderWidth: n })), ' px')}
          <Dropdown
            label="Rahmenstil"
            selectedKey={hover.borderStyle}
            options={BORDER_STYLE_OPTIONS}
            onChange={(e: React.FormEvent<HTMLDivElement>, o?: IDropdownOption) => o && setHover({ borderStyle: o.key as AreaBorderStyle })}
          />
          <ColorField
            label="Füllfarbe (mit Transparenz)"
            value={hover.fillColor}
            fallback="rgba(0, 0, 0, 0)"
            allowAlpha={true}
            onChange={(v: string) => setHover({ fillColor: v })}
          />
          {area.shape === 'rect' && numberField('Eckenradius in Pixel', hover.borderRadius, 0, 200, 1,
            (v?: string) => setInt(v, 0, 200, (n: number) => setHover({ borderRadius: n })), ' px')}

          {visibility && <MessageBar messageBarType={MessageBarType.warning}>{visibility}</MessageBar>}

          <div>
            <Label id="imagemap-preview-label">Vorschau</Label>
            <div className={classNames.previewStage} role="img" aria-labelledby="imagemap-preview-label">
              <div
                className={`${classNames.previewBox} ${getEditAreaClass(area)}`}
                style={area.shape === 'circle' ? { left: '50%', width: 60, marginLeft: -30 } : undefined}
              />
            </div>
            <span className={classNames.srOnly}>
              Tastaturnutzer sehen beim Fokus zusätzlich einen schwarz-weißen Fokusrahmen.
            </span>
          </div>

          <Stack horizontal wrap tokens={{ childrenGap: 4 }}>
            <ActionButton iconProps={{ iconName: 'Copy' }} text="Auf alle Bereiche anwenden"
              onClick={() => props.onApplyHoverToAll(hover)} />
            <ActionButton iconProps={{ iconName: 'Save' }} text="Als Standard für neue Bereiche"
              onClick={() => props.onSaveAsDefaultHover(hover)} />
          </Stack>

          <Separator>Position und Größe (in % des Bildes)</Separator>
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
      )}
    </Panel>
  );
};
