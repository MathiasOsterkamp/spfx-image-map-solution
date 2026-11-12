import * as React from 'react';
import { DefaultButton, PrimaryButton, ActionButton, IconButton } from '@fluentui/react/lib/Button';
import { ChoiceGroup, IChoiceGroupOption } from '@fluentui/react/lib/ChoiceGroup';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Label } from '@fluentui/react/lib/Label';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import { Pivot, PivotItem } from '@fluentui/react/lib/Pivot';
import { IPivotItemProps } from '@fluentui/react/lib/Pivot';
import { Separator } from '@fluentui/react/lib/Separator';
import { SpinButton } from '@fluentui/react/lib/SpinButton';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { TextField } from '@fluentui/react/lib/TextField';
import { Toggle } from '@fluentui/react/lib/Toggle';
import { getId, IRenderFunction } from '@fluentui/react/lib/Utilities';
import { ColorField } from './ColorField';
import { PageSearch } from './PageSearch';
import { useClassNames } from './styles';
import { ISecurityPolicy } from '../config/securityConfig';
import { strings } from '../loc/strings';
import {
  AreaBorderStyle, AreaShape, DEFAULT_HOVER, HOVER_PRESETS, IHoverPreset, IHoverStyle, IImageArea, matchPreset
} from '../models/IImageMap';
import { IPageResult, PageService } from '../services/PageService';
import { circleFromWidth, normalizeRect, IRect } from '../utils/geometry';
import { getEditAreaClass, getHoverRawStyle, getVisibilityWarning } from '../utils/hoverStyles';
import { checkLinkUrl, checkTitle, checkTooltip } from '../utils/validation';

/** CSS class on the link input so the panel focuses it when opened. */
export const FIRST_FIELD_CLASS = 'imagemap-first-field';

export type PropertiesTab = 'link' | 'style' | 'position';

export interface IAreaPropertiesFormProps {
  area: IImageArea;
  index: number;
  policy: ISecurityPolicy;
  pageService: PageService;
  /** Image width / image height, so circles stay round */
  imageRatio: number;
  tab: PropertiesTab;
  onTabChange: (tab: PropertiesTab) => void;
  /** coalesceKey merges typing in one field into a single undo step */
  onChange: (changes: Partial<IImageArea>, label: string, coalesceKey?: string) => void;
  onApplyHoverToAll: (hover: IHoverStyle) => void;
  onSaveAsDefaultHover: (hover: IHoverStyle) => void;
  onAnnounce: (message: string) => void;
}

const SHAPES: AreaShape[] = ['rect', 'circle', 'ellipse'];
const BORDER_STYLES: AreaBorderStyle[] = ['solid', 'dashed', 'dotted', 'double'];

function counter(value: string | undefined, max: number): string {
  return strings.charCounter((value || '').length, max);
}

/** Color swatch of a preset (purely visual, hidden from screen readers). */
function PresetSwatch({ hover }: { hover: IHoverStyle }): JSX.Element {
  const s = getHoverRawStyle(hover, 'rect');
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

/** Tab label with invisible addition for screen readers (Fluent does not apply aria-label to the tab). */
function tabWithHint(hint: string | undefined, hintClassName: string) {
  return hint
    ? (link?: IPivotItemProps, defaultRender?: IRenderFunction<IPivotItemProps>) => (
      <span title={link && link.headerText ? `${link.headerText}: ${hint}` : hint}>
        {defaultRender ? defaultRender(link) : null}
        <span className={hintClassName}>, {hint}</span>
      </span>
    )
    : undefined;
}

/** Form with three tabs. Used in the panel and in full screen (inline). */
export const AreaPropertiesForm: React.FunctionComponent<IAreaPropertiesFormProps> = (props: IAreaPropertiesFormProps) => {
  const classNames = useClassNames();
  const {
    area, policy, onChange, imageRatio, onAnnounce, tab, onTabChange, pageService, onApplyHoverToAll,
    onSaveAsDefaultHover
  } = props;
  const hover: IHoverStyle = area.hover || DEFAULT_HOVER;
  const [searchOpen, setSearchOpen] = React.useState<boolean>(false);
  const searchButtonRef = React.useRef<HTMLButtonElement>(null);
  const ids = React.useRef({ presets: getId('imagemap-presets') });

  const [customize, setCustomize] = React.useState<boolean>(false);
  React.useEffect(() => { setSearchOpen(false); setCustomize(false); }, [area.id]);

  const link = checkLinkUrl(area.url, policy);
  const title = checkTitle(area.title, policy.maxTitleLength);
  const tooltip = checkTooltip(area.tooltip, policy.maxTooltipLength);
  const visibility = getVisibilityWarning(hover);
  const linkTabHasError = !link.valid || !!title.error || !!tooltip.error;
  const matched = matchPreset(hover);
  const preset = customize ? undefined : matched;

  const setHover = (changes: Partial<IHoverStyle>, label: string) =>
    onChange({ hover: { ...hover, ...changes } }, label, `hover-${area.id}-${Object.keys(changes).join()}`);

  const setRect = (key: keyof IRect, raw: string | undefined) => {
    const value = parseFloat((raw || '').replace(',', '.'));
    if (isNaN(value)) { return; }
    const rect: IRect = { x: area.x, y: area.y, width: area.width, height: area.height };
    rect[key] = value;
    onChange(area.shape === 'circle'
      ? circleFromWidth(rect.x, rect.y, rect.width, imageRatio)
      : normalizeRect(rect), strings.labelPositionChanged, `rect-${area.id}-${key}`);
  };

  const setShape = (shape: AreaShape) => {
    if (shape === 'circle') {
      const diameter = Math.min(area.width, area.height / imageRatio);
      onChange({ shape, ...circleFromWidth(area.x, area.y, diameter, imageRatio) }, strings.labelShapeChanged);
    } else {
      onChange({ shape }, strings.labelShapeChanged);
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
      incrementButtonAriaLabel={strings.increaseBy(label, `${step}${suffix || ''}`)}
      decrementButtonAriaLabel={strings.decreaseBy(label, `${step}${suffix || ''}`)}
    />
  );

  const selectPage = (page: IPageResult) => {
    const changes: Partial<IImageArea> = { url: page.url };
    if (!(area.title || '').trim()) { changes.title = page.title; }
    onChange(changes, strings.labelPageSelected);
    setSearchOpen(false);
    onAnnounce(strings.announceTargetSet(page.title));
    window.setTimeout(() => {
      const input = document.querySelector(`.${FIRST_FIELD_CLASS}`) as HTMLInputElement | null;
      if (input) { input.focus(); }
    }, 0);
  };

  const shapeOptions: IChoiceGroupOption[] = SHAPES.map((s: AreaShape) => ({ key: s, text: strings.shapeOptions[s] }));
  const borderStyleOptions: IDropdownOption[] = BORDER_STYLES.map((s: AreaBorderStyle) => ({ key: s, text: strings.borderStyles[s] }));

  const presetOptions: IChoiceGroupOption[] = HOVER_PRESETS.map((p: IHoverPreset): IChoiceGroupOption => ({
    key: p.key,
    text: strings.presets[p.key].name,
    ariaLabel: `${strings.presets[p.key].name}: ${strings.presets[p.key].description}`,
    onRenderLabel: (option?: IChoiceGroupOption) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', paddingLeft: 26 }}>
        <PresetSwatch hover={p.hover} />
        <span>
          <span style={{ display: 'block' }}>{option ? option.text : strings.presets[p.key].name}</span>
          <span style={{ display: 'block', fontSize: 12, color: '#605e5c' }}>{strings.presets[p.key].description}</span>
        </span>
      </span>
    )
  })).concat([{ key: 'custom', text: strings.customStyle, ariaLabel: strings.customStyleAria }]);

  return (
    <Pivot
      selectedKey={tab}
      onLinkClick={(item?: PivotItem) => item && onTabChange(item.props.itemKey as PropertiesTab)}
      aria-label={strings.propertiesAria}
      overflowBehavior="none"
    >
      <PivotItem
        headerText={strings.tabLink}
        itemKey="link"
        itemIcon={linkTabHasError ? 'Warning' : undefined}
        onRenderItemLink={tabWithHint(linkTabHasError ? strings.tabHasErrors : undefined, classNames.srOnly)}
      >
        <Stack tokens={{ childrenGap: 12 }} styles={{ root: { paddingTop: 12 } }}>
          <div>
            <Stack horizontal verticalAlign="end" tokens={{ childrenGap: 4 }}>
              <Stack.Item grow={1}>
                <TextField
                  label={strings.targetUrlLabel}
                  required={true}
                  inputClassName={FIRST_FIELD_CLASS}
                  placeholder={strings.linkPlaceholder}
                  value={area.url}
                  maxLength={policy.maxUrlLength}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, v?: string) =>
                    onChange({ url: v || '' }, strings.labelTargetChanged, `url-${area.id}`)}
                  errorMessage={link.error}
                  description={link.valid && link.kind ? strings.linkKinds[link.kind] : undefined}
                />
              </Stack.Item>
              <IconButton
                elementRef={searchButtonRef}
                iconProps={{ iconName: 'Search' }}
                title={strings.searchPageTitle}
                ariaLabel={strings.searchPageAria}
                aria-expanded={searchOpen}
                checked={searchOpen}
                onClick={() => setSearchOpen(!searchOpen)}
                styles={{ root: { marginBottom: link.error || (link.valid && link.kind) ? 22 : 0 } }}
              />
            </Stack>
            {searchOpen && (
              <div style={{ marginTop: 8 }}>
                <PageSearch
                  service={pageService}
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
                text={strings.fixTo(link.suggestion)}
                onClick={() => onChange({ url: link.suggestion || '' }, strings.labelTargetFixed)}
              />
            )}
            {link.warning && <MessageBar messageBarType={MessageBarType.warning}>{link.warning}</MessageBar>}
          </div>

          <TextField
            label={strings.titleLabel}
            required={true}
            maxLength={policy.maxTitleLength}
            value={area.title}
            onChange={(e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, v?: string) =>
              onChange({ title: v || '' }, strings.labelTitleChanged, `title-${area.id}`)}
            errorMessage={title.error}
            description={title.error ? undefined :
              strings.titleDescription(counter(area.title, policy.maxTitleLength))}
          />
          {title.warning && <MessageBar messageBarType={MessageBarType.warning}>{title.warning}</MessageBar>}

          <TextField
            label={strings.tooltipLabel}
            multiline={true}
            autoAdjustHeight={true}
            rows={2}
            maxLength={policy.maxTooltipLength}
            value={area.tooltip || ''}
            onChange={(e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, v?: string) =>
              onChange({ tooltip: (v || '').replace(/[\r\n]+/g, ' ') }, strings.labelTooltipChanged, `tooltip-${area.id}`)}
            errorMessage={tooltip.error}
            description={tooltip.error ? undefined :
              strings.tooltipDescription(counter(area.tooltip, policy.maxTooltipLength))}
          />

          <Toggle
            label={strings.newTabLabel}
            checked={area.openInNewTab}
            onText={strings.yes}
            offText={strings.no}
            onChange={(e: React.MouseEvent<HTMLElement>, checked?: boolean) =>
              onChange({ openInNewTab: !!checked }, checked ? strings.labelNewTabOn : strings.labelNewTabOff)}
          />
        </Stack>
      </PivotItem>

      <PivotItem
        headerText={strings.tabStyle}
        itemKey="style"
        itemIcon={visibility ? 'Warning' : undefined}
        onRenderItemLink={tabWithHint(visibility ? strings.tabPoorlyVisible : undefined, classNames.srOnly)}
      >
        <Stack tokens={{ childrenGap: 12 }} styles={{ root: { paddingTop: 12 } }}>
          <ChoiceGroup
            label={strings.shapeLabel}
            selectedKey={area.shape}
            options={shapeOptions}
            onChange={(e?: React.FormEvent<HTMLElement | HTMLInputElement>, o?: IChoiceGroupOption) => o && setShape(o.key as AreaShape)}
          />
          <ChoiceGroup
            id={ids.current.presets}
            label={strings.presetLabel}
            selectedKey={preset || 'custom'}
            options={presetOptions}
            onChange={(e?: React.FormEvent<HTMLElement | HTMLInputElement>, o?: IChoiceGroupOption) => {
              if (!o) { return; }
              if (o.key === 'custom') {
                setCustomize(true);
                onAnnounce(strings.announceCustomStyle);
                return;
              }
              setCustomize(false);
              const p = HOVER_PRESETS.filter((x: IHoverPreset) => x.key === o.key)[0];
              if (p) { onChange({ hover: { ...p.hover } }, strings.labelPresetChosen(strings.presets[p.key].name)); }
            }}
          />

          {!preset && (
            <Stack tokens={{ childrenGap: 12 }}>
              <ColorField label={strings.borderColorLabel} value={hover.borderColor} fallback={DEFAULT_HOVER.borderColor} allowAlpha={true}
                onChange={(v: string) => setHover({ borderColor: v }, strings.labelBorderColor)} />
              {numberField(strings.borderWidthLabel, hover.borderWidth, 0, 20, 1,
                (v?: string) => setInt(v, 0, 20, (n: number) => setHover({ borderWidth: n }, strings.labelBorderWidth)), ' px')}
              <Dropdown label={strings.borderStyleLabel} selectedKey={hover.borderStyle} options={borderStyleOptions}
                onChange={(e: React.FormEvent<HTMLDivElement>, o?: IDropdownOption) => o && setHover({ borderStyle: o.key as AreaBorderStyle }, strings.labelBorderStyle)} />
              <ColorField label={strings.fillColorLabel} value={hover.fillColor} fallback="rgba(0, 0, 0, 0)" allowAlpha={true}
                onChange={(v: string) => setHover({ fillColor: v }, strings.labelFillColor)} />
              {area.shape === 'rect' && numberField(strings.cornerRadiusLabel, hover.borderRadius, 0, 200, 1,
                (v?: string) => setInt(v, 0, 200, (n: number) => setHover({ borderRadius: n }, strings.labelCornerRadius)), ' px')}
            </Stack>
          )}

          {visibility && <MessageBar messageBarType={MessageBarType.warning}>{visibility}</MessageBar>}

          <div>
            <Label id="imagemap-preview-label">{strings.preview}</Label>
            <div className={classNames.previewStage} role="img" aria-labelledby="imagemap-preview-label">
              <div className={`${classNames.previewBox} ${getEditAreaClass(area)}`}
                style={area.shape === 'circle' ? { left: '50%', width: 60, marginLeft: -30 } : undefined} />
            </div>
            <Text variant="small" block={true} style={{ marginTop: 4 }}>{strings.focusRingNote}</Text>
          </div>

          <Stack horizontal wrap tokens={{ childrenGap: 4 }}>
            <ActionButton iconProps={{ iconName: 'Copy' }} text={strings.applyToAll} onClick={() => onApplyHoverToAll(hover)} />
            <ActionButton iconProps={{ iconName: 'Save' }} text={strings.saveAsDefault} onClick={() => onSaveAsDefaultHover(hover)} />
          </Stack>
        </Stack>
      </PivotItem>

      <PivotItem headerText={strings.tabPosition} itemKey="position">
        <Stack tokens={{ childrenGap: 12 }} styles={{ root: { paddingTop: 12 } }}>
          <Text variant="small">{strings.positionHint}</Text>
          {numberField(strings.leftLabel, area.x, 0, 100, 0.5, (v?: string) => setRect('x', v), ' %')}
          {numberField(strings.topLabel, area.y, 0, 100, 0.5, (v?: string) => setRect('y', v), ' %')}
          {area.shape === 'circle'
            ? numberField(strings.diameterLabel, area.width, 1, 100, 0.5, (v?: string) => setRect('width', v), ' %')
            : numberField(strings.widthLabel, area.width, 1, 100, 0.5, (v?: string) => setRect('width', v), ' %')}
          {area.shape !== 'circle' &&
            numberField(strings.heightLabel, area.height, 1, 100, 0.5, (v?: string) => setRect('height', v), ' %')}
        </Stack>
      </PivotItem>
    </Pivot>
  );
};

export interface IAreaPropertiesPanelProps extends IAreaPropertiesFormProps {
  isOpen: boolean;
  onDelete: () => void;
  onDismiss: () => void;
  /** After closing (focus back to the area) */
  onDismissed: () => void;
}

export const AreaPropertiesPanel: React.FunctionComponent<IAreaPropertiesPanelProps> = (props: IAreaPropertiesPanelProps) => {
  const { onDismiss, onDelete, isOpen, index, onDismissed } = props;
  const footer = () => (
    <Stack horizontal tokens={{ childrenGap: 8 }}>
      <PrimaryButton text={strings.done} onClick={onDismiss} />
      <DefaultButton text={strings.deleteArea} iconProps={{ iconName: 'Delete' }} onClick={onDelete} />
    </Stack>
  );
  return (
    <Panel
      isOpen={isOpen}
      type={PanelType.custom}
      customWidth="360px"
      isBlocking={false}
      headerText={strings.editAreaTitle(index + 1)}
      closeButtonAriaLabel={strings.closeProperties}
      onDismiss={onDismiss}
      onDismissed={onDismissed}
      onRenderFooterContent={footer}
      isFooterAtBottom={true}
      focusTrapZoneProps={{ firstFocusableSelector: FIRST_FIELD_CLASS }}
    >
      <AreaPropertiesForm {...props} />
    </Panel>
  );
};

/** Full-screen variant: as a column next to the canvas. */
export const AreaPropertiesInline: React.FunctionComponent<IAreaPropertiesFormProps & { onDelete: () => void; onClose: () => void }> =
  (props: IAreaPropertiesFormProps & { onDelete: () => void; onClose: () => void }) => {
    const { index, onDelete, onClose } = props;
    return (
      <section aria-label={strings.propertiesOf(index + 1)} style={{ padding: '8px 16px' }}>
        <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
          <Text variant="large" as="h2" style={{ margin: 0 }}>{strings.area(index + 1)}</Text>
          <Stack horizontal>
            <IconButton iconProps={{ iconName: 'Delete' }} title={strings.deleteArea} ariaLabel={strings.deleteAreaAria(index + 1)} onClick={onDelete} />
            <IconButton iconProps={{ iconName: 'Cancel' }} title={strings.closeProperties} ariaLabel={strings.closeProperties} onClick={onClose} />
          </Stack>
        </Stack>
        <Separator />
        <AreaPropertiesForm {...props} />
      </section>
    );
  };
