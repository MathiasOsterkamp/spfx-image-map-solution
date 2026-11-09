import * as React from 'react';
import { CommandBar, ICommandBarItemProps } from '@fluentui/react/lib/CommandBar';
import { IconButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Link } from '@fluentui/react/lib/Link';
import { Icon } from '@fluentui/react/lib/Icon';
import { Text } from '@fluentui/react/lib/Text';
import { ITextField, TextField } from '@fluentui/react/lib/TextField';
import { css, getId } from '@fluentui/react/lib/Utilities';
import { ISecurityPolicy } from '../config/securityConfig';
import { AreaShape, IHoverStyle, IImageArea } from '../models/IImageMap';
import {
  circleFromDrag, circleFromWidth, createArea, findAttribute, IPoint, IRect, MIN_DRAW_SIZE, moveRect, normalizeRect,
  normalizeShapeRect, rectFromPoints, resizeCircle, resizeRect, ResizeHandle, RESIZE_HANDLES, round2, toPercentPoint, toRect
} from '../utils/geometry';
import { getEditAreaClass } from '../utils/hoverStyles';
import { checkAlt, checkImageUrl, collectIssues, IValidationIssue } from '../utils/validation';
import { ImageService } from '../services/ImageService';
import { ImageMapViewer } from './ImageMapViewer';
import { AreaPropertiesPanel } from './AreaPropertiesPanel';
import { ImagePickerPanel } from './ImagePickerPanel';
import { classNames } from './styles';

export interface IImageMapEditorProps {
  imageUrl: string;
  imageAlt: string;
  areas: IImageArea[];
  stretch: boolean;
  hintAreas: boolean;
  showLinkList: boolean;
  defaultHover: IHoverStyle;
  uploadFolder: string;
  service: ImageService;
  policy: ISecurityPolicy;
  onAreasChange: (areas: IImageArea[]) => void;
  onImageChange: (url: string) => void;
  onImageAltChange: (alt: string) => void;
  onDefaultHoverChange: (hover: IHoverStyle) => void;
}

interface IDragState {
  mode: 'draw' | 'move' | 'resize';
  pointerId: number;
  areaId?: string;
  handle?: ResizeHandle;
  startPoint: IPoint;
  startRect: IRect;
  rect: IRect;
  moved: boolean;
}

const HANDLE_CURSOR: { [key: string]: string } = {
  nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize',
  n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize'
};

const ARROWS: { [key: string]: [number, number] } = {
  ArrowLeft: [-1, 0], Left: [-1, 0],
  ArrowRight: [1, 0], Right: [1, 0],
  ArrowUp: [0, -1], Up: [0, -1],
  ArrowDown: [0, 1], Down: [0, 1]
};

function handlePosition(h: ResizeHandle): React.CSSProperties {
  return {
    left: h.indexOf('w') >= 0 ? '0%' : h.indexOf('e') >= 0 ? '100%' : '50%',
    top: h.indexOf('n') >= 0 ? '0%' : h.indexOf('s') >= 0 ? '100%' : '50%',
    cursor: HANDLE_CURSOR[h]
  };
}

function percentStyle(r: IRect): React.CSSProperties {
  return { left: `${r.x}%`, top: `${r.y}%`, width: `${r.width}%`, height: `${r.height}%` };
}

const SHAPE_NAMES: { [key: string]: string } = { rect: 'Rechteck', circle: 'Kreis', ellipse: 'Ellipse' };
const CORNER_HANDLES: ResizeHandle[] = ['nw', 'ne', 'se', 'sw'];

function fmt(n: number): string {
  return String(Math.round(n * 10) / 10).replace('.', ',');
}

function describeRect(r: IRect, shape?: string): string {
  const size = shape === 'circle' ? `Durchmesser ${fmt(r.width)} % der Bildbreite` : `${fmt(r.width)} mal ${fmt(r.height)} %`;
  return `${fmt(r.x)} % von links, ${fmt(r.y)} % von oben, ${size}`;
}

/** Lesereihenfolge: zeilenweise von oben nach unten, innerhalb einer Zeile von links nach rechts. */
function sortByReadingOrder(areas: IImageArea[]): IImageArea[] {
  return areas.slice().sort((a: IImageArea, b: IImageArea) => {
    const rowA = Math.round(a.y / 5);
    const rowB = Math.round(b.y / 5);
    return rowA !== rowB ? rowA - rowB : a.x - b.x;
  });
}

export const ImageMapEditor: React.FunctionComponent<IImageMapEditorProps> = (props: IImageMapEditorProps) => {
  const areas = props.areas;
  const policy = props.policy;
  /**
   * Immer der aktuelle Stand. Wichtig: Fluents CommandBar puffert Items samt onClick-Handlern.
   * Handler dürfen daher nicht mit dem `areas` aus einem älteren Render arbeiten.
   */
  const areasRef = React.useRef<IImageArea[]>(areas);
  areasRef.current = areas;
  const latest = (): IImageArea[] => areasRef.current;
  const surfaceRef = React.useRef<HTMLDivElement>(null);
  const altFieldRef = React.useRef<ITextField>(null);
  const dragRef = React.useRef<IDragState | null>(null);
  const areaRefs = React.useRef<{ [id: string]: HTMLDivElement | null }>({});
  const ids = React.useRef({
    help: getId('imagemap-help'),
    list: getId('imagemap-list')
  });

  const [selectedId, setSelectedId] = React.useState<string | undefined>(undefined);
  const [panelOpen, setPanelOpen] = React.useState<boolean>(false);
  const [pickerOpen, setPickerOpen] = React.useState<boolean>(false);
  const [testMode, setTestMode] = React.useState<boolean>(false);
  const [testMessage, setTestMessage] = React.useState<string | undefined>(undefined);
  const [drag, setDragState] = React.useState<IDragState | null>(null);
  const [imageFailed, setImageFailed] = React.useState<boolean>(false);
  const [announcement, setAnnouncement] = React.useState<string>('');
  const [focusTarget, setFocusTarget] = React.useState<string | undefined>(undefined);
  const [newShape, setNewShape] = React.useState<AreaShape>('rect');
  /** Bildbreite / Bildhöhe (aus dem geladenen Bild) – nötig, damit Kreise rund bleiben */
  const [imageRatio, setImageRatio] = React.useState<number>(1);
  // Aktuelle Werte für (von der CommandBar gepufferte) Handler
  const newShapeRef = React.useRef<AreaShape>(newShape);
  newShapeRef.current = newShape;
  const testModeRef = React.useRef<boolean>(testMode);
  testModeRef.current = testMode;

  React.useEffect(() => { setImageFailed(false); }, [props.imageUrl]);

  /** Aktuelles Seitenverhältnis: bevorzugt die angezeigte Fläche, sonst das geladene Bild. */
  const getRatio = (): number => {
    const surface = surfaceRef.current;
    if (surface) {
      const box = surface.getBoundingClientRect();
      if (box.width > 0 && box.height > 0) { return box.width / box.height; }
    }
    return imageRatio;
  };

  // Nach einem Bildwechsel die Höhe aller Kreise an das neue Seitenverhältnis anpassen
  React.useEffect(() => {
    const needsUpdate = areas.some((a: IImageArea) => a.shape === 'circle' && Math.abs(a.height - a.width * imageRatio) > 0.05);
    if (needsUpdate) {
      props.onAreasChange(latest().map((a: IImageArea) =>
        a.shape === 'circle' ? { ...a, ...circleFromWidth(a.x, a.y, a.width, imageRatio) } : a));
    }
  }, [imageRatio]);

  // Fokus nach Änderungen gezielt setzen (neuer Bereich, Löschen, Panel geschlossen …)
  React.useEffect(() => {
    if (!focusTarget) { return; }
    if (focusTarget === '#surface') {
      if (surfaceRef.current) { surfaceRef.current.focus(); }
    } else {
      const el = areaRefs.current[focusTarget];
      if (el) { el.focus(); }
    }
    setFocusTarget(undefined);
  }, [focusTarget, areas]);

  /** Ansage für Screenreader über die Live-Region. Wiederholte Texte werden durch ein unsichtbares Zeichen erneut angesagt. */
  const announce = (message: string) => {
    setAnnouncement((prev: string) => (prev === message ? message + ' ' : message));
  };

  const setDrag = (d: IDragState | null) => {
    dragRef.current = d;
    setDragState(d);
  };

  const indexOf = (id: string | undefined): number => {
    for (let i = 0; i < areas.length; i++) {
      if (areas[i].id === id) { return i; }
    }
    return -1;
  };
  const selectedIndex = indexOf(selectedId);
  const selected = selectedIndex >= 0 ? areas[selectedIndex] : undefined;

  const issues = collectIssues(areas, props.imageAlt, policy);
  const areaIssues: { [id: string]: string[] } = {};
  issues.forEach((issue: IValidationIssue) => {
    if (issue.areaId) {
      (areaIssues[issue.areaId] = areaIssues[issue.areaId] || []).push(issue.message);
    }
  });
  const limitReached = areas.length >= policy.maxAreas;

  // ---------------- Datenänderungen ----------------
  const updateArea = (id: string, changes: Partial<IImageArea>) => {
    props.onAreasChange(latest().map((a: IImageArea) => (a.id === id ? { ...a, ...changes } : a)));
  };

  const deleteArea = (id: string) => {
    const current = latest();
    let index = -1;
    current.forEach((a: IImageArea, i: number) => { if (a.id === id) { index = i; } });
    if (index < 0) { return; }
    const remaining = current.filter((a: IImageArea) => a.id !== id);
    props.onAreasChange(remaining);
    setPanelOpen(false);
    announce(`Bereich ${index + 1} gelöscht. ${remaining.length} ${remaining.length === 1 ? 'Bereich' : 'Bereiche'} übrig.`);
    const next = remaining[Math.min(index, remaining.length - 1)];
    setSelectedId(next ? next.id : undefined);
    setFocusTarget(next ? next.id : '#surface');
  };

  const addArea = (rect: IRect) => {
    const current = latest();
    if (current.length >= policy.maxAreas) {
      announce(`Maximal ${policy.maxAreas} Bereiche erlaubt.`);
      return;
    }
    const shape = newShapeRef.current;
    const area = createArea(rect, props.defaultHover, shape, getRatio());
    props.onAreasChange(current.concat([area]));
    setSelectedId(area.id);
    setPanelOpen(true);
    announce(`${SHAPE_NAMES[shape]} als Bereich ${current.length + 1} angelegt. Bitte Link und Titel eingeben.`);
  };

  const moveInOrder = (index: number, delta: number) => {
    const target = index + delta;
    const copy = latest().slice();
    if (target < 0 || target >= copy.length) { return; }
    const item = copy.splice(index, 1)[0];
    copy.splice(target, 0, item);
    props.onAreasChange(copy);
    announce(`Bereich steht jetzt an Position ${target + 1} von ${copy.length} in der Lesereihenfolge.`);
  };

  const openPanelFor = (id: string) => {
    setSelectedId(id);
    setPanelOpen(true);
  };

  // ---------------- Zeiger (Maus, Stift, Touch) ----------------
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const surface = surfaceRef.current;
    if (testMode || e.button !== 0 || !surface) { return; }

    const target = e.target as HTMLElement;
    const areaId = findAttribute(target, 'data-area-id', surface);
    const handle = findAttribute(target, 'data-handle', surface) as ResizeHandle | undefined;
    const p = toPercentPoint(e.clientX, e.clientY, surface);
    let next: IDragState;

    if (areaId) {
      const area = areas.filter((a: IImageArea) => a.id === areaId)[0];
      if (!area) { return; }
      setSelectedId(areaId);
      const el = areaRefs.current[areaId];
      if (el) { el.focus(); }
      next = {
        mode: handle ? 'resize' : 'move', pointerId: e.pointerId, areaId, handle,
        startPoint: p, startRect: toRect(area), rect: toRect(area), moved: false
      };
    } else {
      if (limitReached) { return; }
      setSelectedId(undefined);
      const r: IRect = { x: p.x, y: p.y, width: 0, height: 0 };
      next = { mode: 'draw', pointerId: e.pointerId, startPoint: p, startRect: r, rect: r, moved: false };
    }

    try { surface.setPointerCapture(e.pointerId); } catch (err) { /* nicht unterstützt */ }
    e.preventDefault();
    setDrag(next);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    const surface = surfaceRef.current;
    if (!d || d.pointerId !== e.pointerId || !surface) { return; }

    const p = toPercentPoint(e.clientX, e.clientY, surface);
    const ratio = getRatio();
    const dragged = d.areaId ? areas.filter((a: IImageArea) => a.id === d.areaId)[0] : undefined;
    const isCircle = d.mode === 'draw' ? newShape === 'circle' : !!dragged && dragged.shape === 'circle';
    let rect: IRect;
    if (d.mode === 'draw') {
      rect = isCircle ? circleFromDrag(d.startPoint, p, ratio) : rectFromPoints(d.startPoint, p);
    } else if (d.mode === 'move') {
      rect = moveRect(d.startRect, p.x - d.startPoint.x, p.y - d.startPoint.y);
    } else {
      rect = isCircle
        ? resizeCircle(d.startRect, d.handle || 'se', p, ratio)
        : resizeRect(d.startRect, d.handle || 'se', p);
    }
    if (isCircle && d.mode !== 'move') {
      rect = circleFromWidth(rect.x, rect.y, rect.width, ratio);
    }
    const moved = d.moved || Math.abs(p.x - d.startPoint.x) > 0.2 || Math.abs(p.y - d.startPoint.y) > 0.2;
    setDrag({ ...d, rect, moved });
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    const surface = surfaceRef.current;
    if (!d || d.pointerId !== e.pointerId) { return; }
    try { if (surface) { surface.releasePointerCapture(e.pointerId); } } catch (err) { /* ignorieren */ }
    setDrag(null);
    if (e.type === 'pointercancel' || !d.moved) { return; }

    if (d.mode === 'draw') {
      if (d.rect.width >= MIN_DRAW_SIZE && d.rect.height >= MIN_DRAW_SIZE) {
        addArea(d.rect);
      }
    } else if (d.areaId) {
      const area = areas.filter((a: IImageArea) => a.id === d.areaId)[0];
      const shape = area ? area.shape : 'rect';
      const rect = normalizeShapeRect(d.rect, shape, getRatio());
      updateArea(d.areaId, rect);
      announce(`${d.mode === 'move' ? 'Verschoben' : 'Größe geändert'}: ${describeRect(rect, shape)}.`);
    }
  };

  const onDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const surface = surfaceRef.current;
    if (testMode || !surface) { return; }
    const areaId = findAttribute(e.target as HTMLElement, 'data-area-id', surface);
    if (areaId) { openPanelFor(areaId); }
  };

  // ---------------- Tastatur (pro Bereich) ----------------
  const onAreaKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, area: IImageArea) => {
    const arrow = ARROWS[e.key];
    if (arrow) {
      e.preventDefault();
      e.stopPropagation();
      const step = e.shiftKey ? 5 : 0.5;
      let rect: IRect;
      if ((e.ctrlKey || e.metaKey) && area.shape === 'circle') {
        // Rechts/Unten vergrößert, Links/Oben verkleinert
        rect = circleFromWidth(area.x, area.y, round2(area.width + (arrow[0] + arrow[1]) * step), getRatio());
        announce(`Durchmesser ${fmt(rect.width)} % der Bildbreite.`);
      } else if (e.ctrlKey || e.metaKey) {
        rect = normalizeRect({
          x: area.x, y: area.y,
          width: round2(area.width + arrow[0] * step),
          height: round2(area.height + arrow[1] * step)
        });
        announce(`Größe ${fmt(rect.width)} mal ${fmt(rect.height)} %.`);
      } else {
        rect = normalizeShapeRect(moveRect(toRect(area), arrow[0] * step, arrow[1] * step), area.shape, getRatio());
        announce(`${fmt(rect.x)} % von links, ${fmt(rect.y)} % von oben.`);
      }
      updateArea(area.id, rect);
      return;
    }
    switch (e.key) {
      case 'Enter':
      case ' ':
      case 'Spacebar':
        e.preventDefault();
        openPanelFor(area.id);
        break;
      case 'Delete':
      case 'Del':
        e.preventDefault();
        deleteArea(area.id);
        break;
      case 'Escape':
      case 'Esc':
        if (panelOpen) { setPanelOpen(false); }
        break;
    }
  };

  // ---------------- Toolbar ----------------
  const items: ICommandBarItemProps[] = [
    { key: 'image', text: props.imageUrl ? 'Bild ändern' : 'Bild auswählen', iconProps: { iconName: 'Photo2' }, onClick: () => setPickerOpen(true) },
    {
      key: 'add', text: 'Bereich hinzufügen', iconProps: { iconName: 'Add' }, disabled: !props.imageUrl || testMode || limitReached,
      onClick: () => addArea({ x: 40, y: 40, width: 20, height: 20 })
    },
    {
      key: 'shape',
      text: `Neue Form: ${SHAPE_NAMES[newShape]}`,
      ariaLabel: `Form für neue Bereiche, aktuell ${SHAPE_NAMES[newShape]}`,
      iconProps: { iconName: newShape === 'rect' ? 'RectangleShape' : 'CircleRing' },
      disabled: testMode,
      subMenuProps: {
        items: (['rect', 'circle', 'ellipse'] as AreaShape[]).map((shape: AreaShape) => ({
          key: shape,
          text: SHAPE_NAMES[shape],
          canCheck: true,
          checked: newShape === shape,
          onClick: () => {
            setNewShape(shape);
            announce(`Neue Bereiche werden als ${SHAPE_NAMES[shape]} angelegt.`);
          }
        }))
      }
    },
    {
      key: 'sort', text: 'Lesereihenfolge sortieren', iconProps: { iconName: 'SortLines' }, disabled: areas.length < 2 || testMode,
      title: 'Bereiche von oben links nach unten rechts sortieren (Tab-Reihenfolge)',
      onClick: () => {
        props.onAreasChange(sortByReadingOrder(latest()));
        announce('Lesereihenfolge von oben links nach unten rechts sortiert.');
      }
    }
  ];
  const farItems: ICommandBarItemProps[] = [
    {
      key: 'test',
      text: testMode ? 'Zurück zum Bearbeiten' : 'Vorschau testen',
      iconProps: { iconName: testMode ? 'Edit' : 'Play' },
      checked: testMode,
      disabled: !props.imageUrl,
      onClick: () => {
        const next = !testModeRef.current;
        setTestMode(next);
        setTestMessage(undefined);
        setPanelOpen(false);
        announce(next ? 'Testansicht: Links werden angezeigt, aber nicht geöffnet.' : 'Bearbeitungsansicht.');
      }
    }
  ];

  const picker = (
    <ImagePickerPanel
      isOpen={pickerOpen}
      service={props.service}
      policy={policy}
      folder={props.uploadFolder}
      currentUrl={props.imageUrl}
      hasAreas={areas.length > 0}
      onSelect={(url: string) => {
        props.onImageChange(url);
        setPickerOpen(false);
        announce('Bild übernommen.');
      }}
      onDismiss={() => setPickerOpen(false)}
    />
  );

  const liveRegion = <div className={classNames.srOnly} role="status" aria-live="polite" aria-atomic="true">{announcement}</div>;

  // ---------------- Noch kein Bild ----------------
  if (!props.imageUrl) {
    return (
      <div className={classNames.placeholder}>
        <Icon iconName="Photo2" className={classNames.placeholderIcon} aria-hidden={true} />
        <Text block={true} variant="large" style={{ margin: '8px 0' }}>Bildbereiche verlinken</Text>
        <Text block={true} style={{ marginBottom: 16 }}>
          Wählen Sie ein Bild aus oder laden Sie eines hoch. Danach können Sie klickbare Bereiche festlegen.
        </Text>
        <PrimaryButton text="Bild auswählen" iconProps={{ iconName: 'Photo2' }} onClick={() => setPickerOpen(true)} />
        {picker}
        {liveRegion}
      </div>
    );
  }

  const imageCheck = checkImageUrl(props.imageUrl, policy);

  return (
    <div className={classNames.editor}>
      {liveRegion}
      <CommandBar items={items} farItems={farItems} ariaLabel="Werkzeuge für Bildbereiche" />

      {!imageCheck.valid && (
        <MessageBar messageBarType={MessageBarType.blocked}>
          Das Bild ist nicht erlaubt: {imageCheck.error} Bitte ein anderes Bild auswählen.
        </MessageBar>
      )}

      <TextField
        componentRef={altFieldRef}
        label="Alternativtext des Bildes"
        required={true}
        maxLength={policy.maxAltLength}
        value={props.imageAlt}
        onChange={(e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, v?: string) => props.onImageAltChange(v || '')}
        errorMessage={checkAlt(props.imageAlt, policy.maxAltLength)}
        description="Beschreibt den Bildinhalt für Screenreader, z. B. „Lageplan des Erdgeschosses“. Die Links werden über ihre Beschriftung angesagt."
      />

      {issues.length > 0 && !testMode && (
        <MessageBar messageBarType={MessageBarType.severeWarning} isMultiline={true} styles={{ root: { marginTop: 8 } }}>
          <strong>{issues.length} {issues.length === 1 ? 'Problem' : 'Probleme'}</strong>. Fehlerhafte Bereiche werden im Anzeigemodus nicht als Link ausgegeben.
          <ul className={classNames.issueList}>
            {issues.slice(0, 10).map((issue: IValidationIssue, i: number) => (
              <li key={i}>
                {issue.message}{' '}
                {issue.areaId ? (
                  <Link onClick={() => openPanelFor(issue.areaId!)}>Bereich {(issue.areaIndex || 0) + 1} bearbeiten</Link>
                ) : (
                  <Link onClick={() => altFieldRef.current && altFieldRef.current.focus()}>Zum Feld</Link>
                )}
              </li>
            ))}
          </ul>
          {issues.length > 10 && <span>… und {issues.length - 10} weitere.</span>}
        </MessageBar>
      )}

      {testMode ? (
        <div>
          <div role="status" aria-live="polite" style={{ marginTop: 8 }}>
            <MessageBar messageBarType={MessageBarType.info}>
              {testMessage || 'Testansicht: Bereiche mit Maus oder Tab-Taste ansteuern. Links werden nicht geöffnet.'}
            </MessageBar>
          </div>
          <div style={{ marginTop: 8 }}>
            <ImageMapViewer
              imageUrl={props.imageUrl}
              imageAlt={props.imageAlt}
              areas={areas}
              stretch={props.stretch}
              hintAreas={props.hintAreas}
              showLinkList={props.showLinkList}
              policy={policy}
              onPreviewClick={(a: IImageArea) => setTestMessage(
                `Klick auf „${a.title || 'Bereich'}“ würde ${a.url} öffnen (${a.openInNewTab ? 'neuer Tab' : 'gleiches Fenster'}).`
              )}
            />
          </div>
        </div>
      ) : (
        <div>
          <Text block={true} variant="small" className={classNames.hint} id={ids.current.help}>
            Maus: Form auf dem Bild aufziehen (Form wählbar über „Neue Form“), Bereiche ziehen oder an den Griffen skalieren, Doppelklick öffnet die Eigenschaften.
            Tastatur: Mit Tab zu einem Bereich. Pfeiltasten verschieben, Strg + Pfeiltasten ändern die Größe,
            mit Umschalt in großen Schritten. Enter öffnet die Eigenschaften, Entf löscht. Neue Bereiche über „Bereich hinzufügen“.
          </Text>
          {imageFailed && (
            <MessageBar messageBarType={MessageBarType.error}>Das Bild konnte nicht geladen werden.</MessageBar>
          )}
          {limitReached && (
            <MessageBar messageBarType={MessageBarType.warning}>Maximal {policy.maxAreas} Bereiche pro Bild.</MessageBar>
          )}
          <div className={css(classNames.outer, props.stretch && classNames.outerStretch)}>
            <div
              ref={surfaceRef}
              className={css(classNames.frame, props.stretch && classNames.frameStretch, classNames.surface)}
              tabIndex={-1}
              role="group"
              aria-label={`Bildbereiche bearbeiten, ${areas.length} ${areas.length === 1 ? 'Bereich' : 'Bereiche'}`}
              aria-describedby={ids.current.help}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onDoubleClick={onDoubleClick}
            >
              {imageCheck.valid && (
                <img
                  src={imageCheck.url}
                  alt=""
                  aria-hidden={true}
                  className={css(classNames.image, props.stretch && classNames.imageStretch)}
                  draggable={false}
                  onError={() => setImageFailed(true)}
                  onLoad={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                      setImageRatio(img.naturalWidth / img.naturalHeight);
                    }
                  }}
                />
              )}

              {areas.map((area: IImageArea, index: number) => {
                const isSelected = area.id === selectedId;
                const isDragged = !!drag && drag.mode !== 'draw' && drag.areaId === area.id;
                const rect = isDragged ? drag!.rect : area;
                const problems = areaIssues[area.id];
                const label = `Bereich ${index + 1}, ${SHAPE_NAMES[area.shape]}: ${area.title || 'ohne Titel'}. ${describeRect(area, area.shape)}.` +
                  (problems ? ` ${problems.length === 1 ? 'Ein Problem' : `${problems.length} Probleme`}.` : '');
                return (
                  <div
                    key={area.id}
                    ref={(el: HTMLDivElement | null) => { areaRefs.current[area.id] = el; }}
                    data-area-id={area.id}
                    role="button"
                    tabIndex={0}
                    aria-label={label}
                    aria-describedby={ids.current.help}
                    aria-haspopup="dialog"
                    className={css(
                      classNames.editArea,
                      getEditAreaClass(area),
                      problems && classNames.editAreaMissingLink,
                      isSelected && classNames.editAreaSelected
                    )}
                    style={percentStyle(rect)}
                    title={area.tooltip || area.title || 'Ohne Titel'}
                    onFocus={() => setSelectedId(area.id)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => onAreaKeyDown(e, area)}
                  >
                    <span className={classNames.badge} aria-hidden={true}>{index + 1}</span>
                    {isSelected && (area.shape === 'circle' ? CORNER_HANDLES : RESIZE_HANDLES).map((h: ResizeHandle) => (
                      <span key={h} data-handle={h} className={classNames.handle} style={handlePosition(h)} aria-hidden={true} />
                    ))}
                  </div>
                );
              })}

              {drag && drag.mode === 'draw' && drag.moved && (
                <div
                  className={classNames.draft}
                  style={{ ...percentStyle(drag.rect), borderRadius: newShape === 'rect' ? 0 : '50%' }}
                  aria-hidden={true}
                />
              )}
            </div>
          </div>

          <h3 className={classNames.listHeading} id={ids.current.list}>
            Bereiche in Lesereihenfolge ({areas.length})
          </h3>
          {areas.length === 0 ? (
            <Text variant="small">Noch keine Bereiche festgelegt.</Text>
          ) : (
            <ul className={classNames.list} aria-labelledby={ids.current.list}>
              {areas.map((area: IImageArea, index: number) => {
                const problems = areaIssues[area.id];
                const name = area.title || 'Ohne Titel';
                return (
                  <li key={area.id} className={css(classNames.listRow, area.id === selectedId && classNames.listRowSelected)}>
                    <button
                      type="button"
                      className={classNames.listSelect}
                      aria-current={area.id === selectedId ? 'true' : undefined}
                      onClick={() => { setSelectedId(area.id); setFocusTarget(area.id); }}
                    >
                      <span className={classNames.listIndex} aria-hidden={true}>{index + 1}</span>
                      <span className={classNames.listText}>
                        {problems && <Icon iconName="Warning" className={classNames.issueIcon} aria-hidden={true} />}
                        <span className={classNames.srOnly}>Bereich {index + 1}, {SHAPE_NAMES[area.shape]}: </span>
                        {name} – {area.url || 'kein Link'}
                        {area.openInNewTab && <span aria-hidden={true}> ↗</span>}
                        {area.openInNewTab && <span className={classNames.srOnly}> (neuer Tab)</span>}
                        {problems && <span className={classNames.srOnly}> Fehler: {problems.join(' ')}</span>}
                      </span>
                    </button>
                    <IconButton iconProps={{ iconName: 'ChevronUp' }} title="Nach vorne in der Lesereihenfolge"
                      ariaLabel={`Bereich ${index + 1} in der Lesereihenfolge nach vorne`} disabled={index === 0}
                      onClick={() => moveInOrder(index, -1)} />
                    <IconButton iconProps={{ iconName: 'ChevronDown' }} title="Nach hinten in der Lesereihenfolge"
                      ariaLabel={`Bereich ${index + 1} in der Lesereihenfolge nach hinten`} disabled={index === areas.length - 1}
                      onClick={() => moveInOrder(index, 1)} />
                    <IconButton iconProps={{ iconName: 'Edit' }} title="Bearbeiten"
                      ariaLabel={`Bereich ${index + 1}, ${name}, bearbeiten`} onClick={() => openPanelFor(area.id)} />
                    <IconButton iconProps={{ iconName: 'Delete' }} title="Löschen"
                      ariaLabel={`Bereich ${index + 1}, ${name}, löschen`} onClick={() => deleteArea(area.id)} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <AreaPropertiesPanel
        isOpen={panelOpen && !testMode}
        area={selected}
        index={selectedIndex}
        policy={policy}
        imageRatio={imageRatio}
        onChange={(changes: Partial<IImageArea>) => { if (selected) { updateArea(selected.id, changes); } }}
        onDelete={() => { if (selected) { deleteArea(selected.id); } }}
        onDismiss={() => setPanelOpen(false)}
        onDismissed={() => { if (selected) { setFocusTarget(selected.id); } }}
        onApplyHoverToAll={(hover: IHoverStyle) => {
          props.onAreasChange(latest().map((a: IImageArea) => ({ ...a, hover: { ...hover } })));
          announce('Darstellung auf alle Bereiche angewendet.');
        }}
        onSaveAsDefaultHover={(hover: IHoverStyle) => {
          props.onDefaultHoverChange({ ...hover });
          announce('Als Standard für neue Bereiche gespeichert.');
        }}
      />
      {picker}
    </div>
  );
};
