import * as React from 'react';
import { IconButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Modal } from '@fluentui/react/lib/Modal';
import { Icon } from '@fluentui/react/lib/Icon';
import { Text } from '@fluentui/react/lib/Text';
import { css, getId } from '@fluentui/react/lib/Utilities';
import { ISecurityPolicy } from '../config/securityConfig';
import { AreaShape, IHoverStyle, IImageArea } from '../models/IImageMap';
import {
  circleFromDrag, circleFromWidth, createArea, findAttribute, IPoint, IRect, MIN_DRAW_SIZE, moveRect, normalizeRect,
  normalizeShapeRect, rectFromPoints, resizeCircle, resizeRect, ResizeHandle, RESIZE_HANDLES, round2, toPercentPoint, toRect
} from '../utils/geometry';
import { getEditAreaClass } from '../utils/hoverStyles';
import { checkImageUrl, collectIssues, IValidationIssue } from '../utils/validation';
import { ImageService } from '../services/ImageService';
import { PageService } from '../services/PageService';
import { useAreaHistory } from '../hooks/useAreaHistory';
import { ImageMapViewer } from './ImageMapViewer';
import { AreaPropertiesInline, AreaPropertiesPanel, FIRST_FIELD_CLASS, PropertiesTab } from './AreaPropertiesPanel';
import { ImagePickerPanel } from './ImagePickerPanel';
import { AltTextDialog } from './AltTextDialog';
import { EditorTool, EditorToolbar, TOOL_NAMES } from './EditorToolbar';
import { QuickActions } from './QuickActions';
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
  pageService: PageService;
  policy: ISecurityPolicy;
  onAreasChange: (areas: IImageArea[]) => void;
  onImageChange: (url: string) => void;
  onImageAltChange: (alt: string) => void;
  onDefaultHoverChange: (hover: IHoverStyle) => void;
}

interface IDragState {
  mode: 'draw' | 'move' | 'resize';
  shape: AreaShape;
  pointerId: number;
  areaId?: string;
  handle?: ResizeHandle;
  startPoint: IPoint;
  startRect: IRect;
  rect: IRect;
  moved: boolean;
}

const SHAPE_NAMES: { [key: string]: string } = { rect: 'Rechteck', circle: 'Kreis', ellipse: 'Ellipse' };
const CORNER_HANDLES: ResizeHandle[] = ['nw', 'ne', 'se', 'sw'];
const TOOL_KEYS: { [key: string]: EditorTool } = { v: 'select', r: 'rect', k: 'circle', e: 'ellipse' };
const HANDLE_CURSOR: { [key: string]: string } = {
  nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize',
  n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize'
};
const ARROWS: { [key: string]: [number, number] } = {
  ArrowLeft: [-1, 0], Left: [-1, 0], ArrowRight: [1, 0], Right: [1, 0],
  ArrowUp: [0, -1], Up: [0, -1], ArrowDown: [0, 1], Down: [0, 1]
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

function fmt(n: number): string {
  return String(Math.round(n * 10) / 10).replace('.', ',');
}

function describeRect(r: IRect, shape?: string): string {
  const size = shape === 'circle' ? `Durchmesser ${fmt(r.width)} % der Bildbreite` : `${fmt(r.width)} mal ${fmt(r.height)} %`;
  return `${fmt(r.x)} % von links, ${fmt(r.y)} % von oben, ${size}`;
}

function sortByReadingOrder(areas: IImageArea[]): IImageArea[] {
  return areas.slice().sort((a: IImageArea, b: IImageArea) => {
    const rowA = Math.round(a.y / 5);
    const rowB = Math.round(b.y / 5);
    return rowA !== rowB ? rowA - rowB : a.x - b.x;
  });
}

function isTextInput(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node || !node.tagName) { return false; }
  const tag = node.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || node.isContentEditable;
}

export const ImageMapEditor: React.FunctionComponent<IImageMapEditorProps> = (props: IImageMapEditorProps) => {
  const areas = props.areas;
  const policy = props.policy;

  // ---------- Refs (immer aktueller Stand – die CommandBar puffert Handler) ----------
  const areasRef = React.useRef<IImageArea[]>(areas);
  areasRef.current = areas;
  const latest = (): IImageArea[] => areasRef.current;
  const surfaceRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<IDragState | null>(null);
  const areaRefs = React.useRef<{ [id: string]: HTMLDivElement | null }>({});
  const ids = React.useRef({
    help: getId('imagemap-help'),
    list: getId('imagemap-list'),
    modalTitle: getId('imagemap-fullscreen')
  });

  // ---------- Zustand ----------
  const [selectedId, setSelectedId] = React.useState<string | undefined>(undefined);
  const [panelOpen, setPanelOpen] = React.useState<boolean>(false);
  const [propsTab, setPropsTab] = React.useState<PropertiesTab>('link');
  const [pickerOpen, setPickerOpen] = React.useState<boolean>(false);
  const [altOpen, setAltOpen] = React.useState<boolean>(false);
  const [testMode, setTestMode] = React.useState<boolean>(false);
  const [testMessage, setTestMessage] = React.useState<string | undefined>(undefined);
  const [fullscreen, setFullscreen] = React.useState<boolean>(false);
  const [tool, setToolState] = React.useState<EditorTool>('select');
  const [drag, setDragState] = React.useState<IDragState | null>(null);
  const [imageFailed, setImageFailed] = React.useState<boolean>(false);
  const [imageRatio, setImageRatio] = React.useState<number>(1);
  const [announcement, setAnnouncement] = React.useState<string>('');
  const [focusTarget, setFocusTarget] = React.useState<string | undefined>(undefined);

  const toolRef = React.useRef<EditorTool>(tool);
  toolRef.current = tool;
  const stateRef = React.useRef({ testMode, fullscreen, panelOpen });
  stateRef.current = { testMode, fullscreen, panelOpen };

  /** Ansage für Screenreader. Gleiche Texte werden durch ein unsichtbares Zeichen erneut angesagt. */
  const announce = (message: string) => {
    setAnnouncement((prev: string) => (prev === message ? message + ' ' : message));
  };

  const history = useAreaHistory(latest, props.onAreasChange, announce);

  React.useEffect(() => { setImageFailed(false); }, [props.imageUrl]);

  // Fokus gezielt setzen (neuer Bereich, Löschen, Panel geschlossen, Vollbild beendet …)
  React.useEffect(() => {
    if (!focusTarget) { return; }
    if (focusTarget === '#surface') {
      if (surfaceRef.current) { surfaceRef.current.focus(); }
    } else if (focusTarget === '#first-field') {
      const input = document.querySelector(`.${FIRST_FIELD_CLASS}`) as HTMLElement | null;
      if (input) { input.focus(); }
    } else {
      const el = areaRefs.current[focusTarget];
      if (el) { el.focus(); }
    }
    setFocusTarget(undefined);
  });

  const getRatio = (): number => {
    const surface = surfaceRef.current;
    if (surface) {
      const box = surface.getBoundingClientRect();
      if (box.width > 0 && box.height > 0) { return box.width / box.height; }
    }
    return imageRatio;
  };

  // Kreise an ein neues Seitenverhältnis anpassen (z. B. nach Bildwechsel) – ohne Rückgängig-Schritt
  React.useEffect(() => {
    const current = latest();
    if (current.some((a: IImageArea) => a.shape === 'circle' && Math.abs(a.height - a.width * imageRatio) > 0.05)) {
      props.onAreasChange(current.map((a: IImageArea) =>
        a.shape === 'circle' ? { ...a, ...circleFromWidth(a.x, a.y, a.width, imageRatio) } : a));
    }
  }, [imageRatio]);

  const setDrag = (d: IDragState | null) => {
    dragRef.current = d;
    setDragState(d);
  };

  const indexOf = (id: string | undefined, list: IImageArea[] = areas): number => {
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) { return i; }
    }
    return -1;
  };
  const selectedIndex = indexOf(selectedId);
  const selected = selectedIndex >= 0 ? areas[selectedIndex] : undefined;

  const issues = collectIssues(areas, props.imageAlt, policy);
  const areaIssues: { [id: string]: string[] } = {};
  issues.forEach((issue: IValidationIssue) => {
    if (issue.areaId) { (areaIssues[issue.areaId] = areaIssues[issue.areaId] || []).push(issue.message); }
  });
  const limitReached = areas.length >= policy.maxAreas;

  // ---------------- Werkzeuge ----------------
  const setTool = (next: EditorTool) => {
    setToolState(next);
    announce(next === 'select'
      ? 'Werkzeug Auswählen.'
      : `Werkzeug ${TOOL_NAMES[next]}. Mit der Maus aufziehen oder auf der Zeichenfläche Enter drücken.`);
  };

  // ---------------- Datenänderungen (alle über den Verlauf → Rückgängig möglich) ----------------
  const updateArea = (id: string, changes: Partial<IImageArea>, label: string, coalesceKey?: string) => {
    history.commit(latest().map((a: IImageArea) => (a.id === id ? { ...a, ...changes } : a)), label, coalesceKey);
  };

  const addArea = (rect: IRect, shape: AreaShape, how: string) => {
    const current = latest();
    if (current.length >= policy.maxAreas) {
      announce(`Maximal ${policy.maxAreas} Bereiche erlaubt.`);
      return;
    }
    const area = createArea(rect, props.defaultHover, shape, getRatio());
    history.commit(current.concat([area]), `${SHAPE_NAMES[shape]} ${how}`);
    setSelectedId(area.id);
    setPropsTab('link');
    setPanelOpen(true);
    if (stateRef.current.fullscreen) { setFocusTarget('#first-field'); }
    announce(`${SHAPE_NAMES[shape]} als Bereich ${current.length + 1} ${how}. Bitte Ziel und Titel eingeben.`);
  };

  const insertCentered = (shape: AreaShape) => {
    const ratio = getRatio();
    const rect = shape === 'circle'
      ? circleFromWidth(40, 50 - (20 * ratio) / 2, 20, ratio)
      : { x: 40, y: 40, width: 20, height: 20 };
    addArea(rect, shape, 'eingefügt');
    setToolState('select');
  };

  const duplicateArea = (area: IImageArea) => {
    const current = latest();
    if (current.length >= policy.maxAreas) { announce(`Maximal ${policy.maxAreas} Bereiche erlaubt.`); return; }
    const copy = { ...createArea(moveRect(toRect(area), 2, 2), area.hover, area.shape, getRatio()), url: area.url, title: area.title, tooltip: area.tooltip, openInNewTab: area.openInNewTab };
    history.commit(current.concat([copy]), 'Bereich dupliziert');
    setSelectedId(copy.id);
    setFocusTarget(copy.id);
    announce(`Bereich dupliziert als Bereich ${current.length + 1}.`);
  };

  const deleteArea = (id: string) => {
    const current = latest();
    const index = indexOf(id, current);
    if (index < 0) { return; }
    const remaining = current.filter((a: IImageArea) => a.id !== id);
    history.commit(remaining, `Bereich ${index + 1} gelöscht`);
    setPanelOpen(false);
    announce(`Bereich ${index + 1} gelöscht. ${remaining.length} ${remaining.length === 1 ? 'Bereich' : 'Bereiche'} übrig. Strg+Z macht es rückgängig.`);
    const next = remaining[Math.min(index, remaining.length - 1)];
    setSelectedId(next ? next.id : undefined);
    setFocusTarget(next ? next.id : '#surface');
  };

  const moveInOrder = (index: number, delta: number) => {
    const copy = latest().slice();
    const target = index + delta;
    if (target < 0 || target >= copy.length) { return; }
    const item = copy.splice(index, 1)[0];
    copy.splice(target, 0, item);
    history.commit(copy, 'Reihenfolge geändert');
    announce(`Bereich steht jetzt an Position ${target + 1} von ${copy.length} in der Lesereihenfolge.`);
  };

  const openProperties = (id: string, tab: PropertiesTab = 'link') => {
    setSelectedId(id);
    setPropsTab(tab);
    setPanelOpen(true);
    if (stateRef.current.fullscreen) { setFocusTarget('#first-field'); }
  };

  const closeProperties = () => {
    setPanelOpen(false);
    if (stateRef.current.fullscreen && selectedId) { setFocusTarget(selectedId); }
  };

  const toggleFullscreen = () => {
    const next = !stateRef.current.fullscreen;
    setFullscreen(next);
    setFocusTarget(selectedId || '#surface');
    announce(next ? 'Vollbild. Esc beendet das Vollbild.' : 'Vollbild beendet.');
  };

  // ---------------- Zeiger (Maus, Stift, Touch) ----------------
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const surface = surfaceRef.current;
    if (testMode || e.button !== 0 || !surface) { return; }
    const target = e.target as HTMLElement;
    if (findAttribute(target, 'data-ui', surface)) { return; } // Schnellaktionen

    const areaId = findAttribute(target, 'data-area-id', surface);
    const handle = findAttribute(target, 'data-handle', surface) as ResizeHandle | undefined;
    const p = toPercentPoint(e.clientX, e.clientY, surface);
    let next: IDragState;

    if (areaId) {
      const area = latest().filter((a: IImageArea) => a.id === areaId)[0];
      if (!area) { return; }
      setSelectedId(areaId);
      const el = areaRefs.current[areaId];
      if (el) { el.focus(); }
      next = {
        mode: handle ? 'resize' : 'move', shape: area.shape, pointerId: e.pointerId, areaId, handle,
        startPoint: p, startRect: toRect(area), rect: toRect(area), moved: false
      };
    } else {
      setSelectedId(undefined);
      setPanelOpen(false);
      const current = toolRef.current;
      if (current === 'select' || limitReached) { return; }
      const r: IRect = { x: p.x, y: p.y, width: 0, height: 0 };
      next = { mode: 'draw', shape: current, pointerId: e.pointerId, startPoint: p, startRect: r, rect: r, moved: false };
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
    const isCircle = d.shape === 'circle';
    let rect: IRect;
    if (d.mode === 'draw') {
      rect = isCircle ? circleFromDrag(d.startPoint, p, ratio) : rectFromPoints(d.startPoint, p);
    } else if (d.mode === 'move') {
      rect = moveRect(d.startRect, p.x - d.startPoint.x, p.y - d.startPoint.y);
    } else {
      rect = isCircle ? resizeCircle(d.startRect, d.handle || 'se', p, ratio) : resizeRect(d.startRect, d.handle || 'se', p);
    }
    if (isCircle && d.mode !== 'move') { rect = circleFromWidth(rect.x, rect.y, rect.width, ratio); }
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
        addArea(d.rect, d.shape, 'gezeichnet');
        setToolState('select'); // wie in Office: nach dem Zeichnen zurück zu „Auswählen“
      }
    } else if (d.areaId) {
      const rect = normalizeShapeRect(d.rect, d.shape, getRatio());
      updateArea(d.areaId, rect, d.mode === 'move' ? 'Bereich verschoben' : 'Größe geändert');
      announce(`${d.mode === 'move' ? 'Verschoben' : 'Größe geändert'}: ${describeRect(rect, d.shape)}.`);
    }
  };

  const onDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const surface = surfaceRef.current;
    if (testMode || !surface || findAttribute(e.target as HTMLElement, 'data-ui', surface)) { return; }
    const areaId = findAttribute(e.target as HTMLElement, 'data-area-id', surface);
    if (areaId) { openProperties(areaId); }
  };

  // ---------------- Tastatur ----------------
  /** Editorweit: Rückgängig/Wiederholen (nicht in Textfeldern – dort gilt das native Rückgängig). */
  const onEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (stateRef.current.testMode || isTextInput(e.target)) { return; }
    const key = (e.key || '').toLowerCase();
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      if (key === 'z' && !e.shiftKey) { e.preventDefault(); history.undo(); }
      else if (key === 'y' || (key === 'z' && e.shiftKey)) { e.preventDefault(); history.redo(); }
    }
  };

  /**
   * Zeichenfläche: Werkzeug-Kurztasten V/R/K/E und Enter zum Einfügen.
   * Einzeltasten wirken NUR, wenn der Fokus auf der Zeichenfläche oder einem Bereich liegt (WCAG 2.1.4).
   */
  const onSurfaceKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const surface = surfaceRef.current;
    if (!surface || stateRef.current.testMode || e.ctrlKey || e.metaKey || e.altKey) { return; }
    if (findAttribute(e.target as HTMLElement, 'data-ui', surface)) { return; }
    const nextTool = TOOL_KEYS[(e.key || '').toLowerCase()];
    if (nextTool) {
      e.preventDefault();
      setTool(nextTool);
      return;
    }
    if (e.key === 'Enter' && e.target === surface) {
      e.preventDefault();
      const current = toolRef.current;
      if (current === 'select') {
        announce('Wählen Sie zuerst eine Form: R für Rechteck, K für Kreis, E für Ellipse. Oder Tab zu einem Bereich.');
      } else {
        insertCentered(current);
      }
    }
  };

  const onAreaKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, area: IImageArea) => {
    const arrow = ARROWS[e.key];
    if (arrow) {
      e.preventDefault();
      e.stopPropagation();
      const step = e.shiftKey ? 5 : 0.5;
      let rect: IRect;
      let label: string;
      if ((e.ctrlKey || e.metaKey) && area.shape === 'circle') {
        rect = circleFromWidth(area.x, area.y, round2(area.width + (arrow[0] + arrow[1]) * step), getRatio());
        label = 'Größe geändert';
        announce(`Durchmesser ${fmt(rect.width)} % der Bildbreite.`);
      } else if (e.ctrlKey || e.metaKey) {
        rect = normalizeRect({ x: area.x, y: area.y, width: round2(area.width + arrow[0] * step), height: round2(area.height + arrow[1] * step) });
        label = 'Größe geändert';
        announce(`Größe ${fmt(rect.width)} mal ${fmt(rect.height)} %.`);
      } else {
        rect = normalizeShapeRect(moveRect(toRect(area), arrow[0] * step, arrow[1] * step), area.shape, getRatio());
        label = 'Bereich verschoben';
        announce(`${fmt(rect.x)} % von links, ${fmt(rect.y)} % von oben.`);
      }
      updateArea(area.id, rect, label, `${label}-${area.id}`);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key || '').toLowerCase() === 'd') {
      e.preventDefault();
      e.stopPropagation();
      duplicateArea(area);
      return;
    }
    switch (e.key) {
      case 'Enter':
      case ' ':
      case 'Spacebar':
        e.preventDefault();
        e.stopPropagation();
        openProperties(area.id);
        break;
      case 'Delete':
      case 'Del':
        e.preventDefault();
        e.stopPropagation();
        deleteArea(area.id);
        break;
      case 'Escape':
      case 'Esc':
        // Erst das Panel schließen; sonst darf Esc das Vollbild beenden.
        if (stateRef.current.panelOpen) {
          e.preventDefault();
          e.stopPropagation();
          closeProperties();
        }
        break;
    }
  };

  // ---------------- Teile ----------------
  const picker = (
    <ImagePickerPanel
      isOpen={pickerOpen}
      service={props.service}
      policy={policy}
      folder={props.uploadFolder}
      currentUrl={props.imageUrl}
      hasAreas={areas.length > 0}
      onSelect={(url: string) => { props.onImageChange(url); setPickerOpen(false); announce('Bild übernommen.'); }}
      onDismiss={() => setPickerOpen(false)}
    />
  );
  const altDialog = (
    <AltTextDialog
      isOpen={altOpen}
      value={props.imageAlt}
      maxLength={policy.maxAltLength}
      onSave={(alt: string) => { props.onImageAltChange(alt); setAltOpen(false); announce('Alternativtext gespeichert.'); }}
      onDismiss={() => setAltOpen(false)}
    />
  );
  const liveRegion = <div className={classNames.srOnly} role="status" aria-live="polite" aria-atomic="true">{announcement}</div>;

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

  const formProps = selected ? {
    area: selected,
    index: selectedIndex,
    policy,
    pageService: props.pageService,
    imageRatio,
    tab: propsTab,
    onTabChange: setPropsTab,
    onChange: (changes: Partial<IImageArea>, label: string, coalesceKey?: string) => updateArea(selected.id, changes, label, coalesceKey),
    onApplyHoverToAll: (hover: IHoverStyle) => {
      history.commit(latest().map((a: IImageArea) => ({ ...a, hover: { ...hover } })), 'Stil auf alle angewendet');
      announce('Stil auf alle Bereiche angewendet.');
    },
    onSaveAsDefaultHover: (hover: IHoverStyle) => {
      props.onDefaultHoverChange({ ...hover });
      announce('Als Standard für neue Bereiche gespeichert.');
    },
    onAnnounce: announce
  } : undefined;

  const canvas = (
    <div className={classNames.canvasCol}>
      <Text block={true} variant="small" className={classNames.hint} id={ids.current.help}>
        Werkzeug wählen (V Auswählen, R Rechteck, K Kreis, E Ellipse) und auf dem Bild aufziehen – oder Enter auf der Zeichenfläche
        fügt die Form ein. Auf einem Bereich: Pfeiltasten verschieben, Strg + Pfeiltasten ändern die Größe, Umschalt für große Schritte,
        Enter öffnet die Eigenschaften, Strg+D dupliziert, Entf löscht. Strg+Z macht rückgängig.
      </Text>
      {imageFailed && <MessageBar messageBarType={MessageBarType.error}>Das Bild konnte nicht geladen werden.</MessageBar>}
      <div className={css(classNames.outer, props.stretch && classNames.outerStretch)}>
        <div
          ref={surfaceRef}
          className={css(classNames.frame, props.stretch && classNames.frameStretch, classNames.surface)}
          style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
          tabIndex={0}
          role="application"
          aria-roledescription="Zeichenfläche"
          aria-label={`Zeichenfläche, Werkzeug ${TOOL_NAMES[tool]}, ${areas.length} ${areas.length === 1 ? 'Bereich' : 'Bereiche'}`}
          aria-describedby={ids.current.help}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onDoubleClick={onDoubleClick}
          onKeyDown={onSurfaceKeyDown}
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
                if (img.naturalWidth > 0 && img.naturalHeight > 0) { setImageRatio(img.naturalWidth / img.naturalHeight); }
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
              <React.Fragment key={area.id}>
                <div
                  ref={(el: HTMLDivElement | null) => { areaRefs.current[area.id] = el; }}
                  data-area-id={area.id}
                  role="button"
                  tabIndex={0}
                  aria-label={label}
                  aria-describedby={ids.current.help}
                  aria-haspopup="dialog"
                  className={css(classNames.editArea, getEditAreaClass(area), problems && classNames.editAreaMissingLink,
                    isSelected && classNames.editAreaSelected)}
                  style={percentStyle(rect)}
                  title={area.tooltip || area.title || 'Ohne Titel'}
                  onFocus={() => setSelectedId(area.id)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => onAreaKeyDown(e, area)}
                >
                  <span className={classNames.badge} aria-hidden={true}>{index + 1}</span>
                  {problems && <span className={classNames.issueBadge} aria-hidden={true}>!</span>}
                  {isSelected && (area.shape === 'circle' ? CORNER_HANDLES : RESIZE_HANDLES).map((h: ResizeHandle) => (
                    <span key={h} data-handle={h} className={classNames.handle} style={handlePosition(h)} aria-hidden={true} />
                  ))}
                </div>
                {isSelected && !drag && (
                  <QuickActions
                    area={area}
                    index={index}
                    onEdit={() => openProperties(area.id)}
                    onDuplicate={() => duplicateArea(area)}
                    onDelete={() => deleteArea(area.id)}
                    onEscape={() => setFocusTarget(area.id)}
                  />
                )}
              </React.Fragment>
            );
          })}
          {drag && drag.mode === 'draw' && drag.moved && (
            <div className={classNames.draft} style={{ ...percentStyle(drag.rect), borderRadius: drag.shape === 'rect' ? 0 : '50%' }} aria-hidden={true} />
          )}
        </div>
      </div>

      <h3 className={classNames.listHeading} id={ids.current.list}>Bereiche in Lesereihenfolge ({areas.length})</h3>
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
                  ariaLabel={`Bereich ${index + 1} in der Lesereihenfolge nach vorne`} disabled={index === 0} onClick={() => moveInOrder(index, -1)} />
                <IconButton iconProps={{ iconName: 'ChevronDown' }} title="Nach hinten in der Lesereihenfolge"
                  ariaLabel={`Bereich ${index + 1} in der Lesereihenfolge nach hinten`} disabled={index === areas.length - 1} onClick={() => moveInOrder(index, 1)} />
                <IconButton iconProps={{ iconName: 'Edit' }} title="Bearbeiten"
                  ariaLabel={`Bereich ${index + 1}, ${name}, bearbeiten`} onClick={() => openProperties(area.id)} />
                <IconButton iconProps={{ iconName: 'Delete' }} title="Löschen"
                  ariaLabel={`Bereich ${index + 1}, ${name}, löschen`} onClick={() => deleteArea(area.id)} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  const body = (
    <div className={classNames.editor} onKeyDown={onEditorKeyDown} style={fullscreen ? { border: 'none', height: '100%', display: 'flex', flexDirection: 'column' } : undefined}>
      {liveRegion}
      <EditorToolbar
        tool={tool}
        hasImage={!!props.imageUrl}
        testMode={testMode}
        fullscreen={fullscreen}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        undoLabel={history.undoLabel}
        redoLabel={history.redoLabel}
        canSort={areas.length > 1}
        limitReached={limitReached}
        issues={issues}
        onToolChange={(t: EditorTool) => { setTool(t); setFocusTarget('#surface'); }}
        onInsert={insertCentered}
        onChooseImage={() => setPickerOpen(true)}
        onEditAlt={() => setAltOpen(true)}
        onUndo={() => history.undo()}
        onRedo={() => history.redo()}
        onSort={() => { history.commit(sortByReadingOrder(latest()), 'Lesereihenfolge sortiert'); announce('Lesereihenfolge von oben links nach unten rechts sortiert.'); }}
        onToggleTest={() => {
          const next = !stateRef.current.testMode;
          setTestMode(next);
          setTestMessage(undefined);
          setPanelOpen(false);
          announce(next ? 'Vorschau: Links werden angezeigt, aber nicht geöffnet.' : 'Bearbeiten.');
        }}
        onToggleFullscreen={toggleFullscreen}
        onIssueSelect={(issue: IValidationIssue) => {
          if (issue.areaId) {
            openProperties(issue.areaId, 'link');
          } else {
            setAltOpen(true);
          }
        }}
      />

      {!imageCheck.valid && (
        <MessageBar messageBarType={MessageBarType.blocked}>Das Bild ist nicht erlaubt: {imageCheck.error}</MessageBar>
      )}

      {testMode ? (
        <div style={{ padding: 8, overflow: 'auto' }}>
          <div role="status" aria-live="polite">
            <MessageBar messageBarType={MessageBarType.info}>
              {testMessage || 'Vorschau: Bereiche mit Maus oder Tab-Taste ansteuern. Links werden nicht geöffnet.'}
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
                `Klick auf „${a.title || 'Bereich'}“ würde ${a.url} öffnen (${a.openInNewTab ? 'neuer Tab' : 'gleiches Fenster'}).`)}
            />
          </div>
        </div>
      ) : (
        <div className={classNames.canvasRow} style={fullscreen ? { flex: 1, overflow: 'auto' } : undefined}>
          {canvas}
          {fullscreen && formProps && panelOpen && (
            <div className={classNames.sideCol}>
              <AreaPropertiesInline {...formProps} onDelete={() => deleteArea(formProps.area.id)} onClose={closeProperties} />
            </div>
          )}
        </div>
      )}

      {!fullscreen && formProps && (
        <AreaPropertiesPanel
          {...formProps}
          isOpen={panelOpen && !testMode}
          onDelete={() => deleteArea(formProps.area.id)}
          onDismiss={() => setPanelOpen(false)}
          onDismissed={() => { if (selectedId) { setFocusTarget(selectedId); } }}
        />
      )}
      {picker}
      {altDialog}
    </div>
  );

  if (!fullscreen) {
    return body;
  }
  return (
    <div>
      <div className={classNames.fullscreenNote}>Die Bildbereiche werden im Vollbild bearbeitet.</div>
      <Modal
        isOpen={true}
        onDismiss={toggleFullscreen}
        isBlocking={false}
        titleAriaId={ids.current.modalTitle}
        styles={{
          main: { width: 'calc(100vw - 32px)', height: 'calc(100vh - 32px)', maxWidth: 'none', maxHeight: 'none' },
          scrollableContent: { height: '100%', display: 'flex', flexDirection: 'column' }
        }}
      >
        <h2 id={ids.current.modalTitle} className={classNames.srOnly}>Bildbereiche bearbeiten – Vollbild</h2>
        {body}
      </Modal>
    </div>
  );
};
