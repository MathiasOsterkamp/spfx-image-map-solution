import * as React from 'react';
import { IconButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Modal } from '@fluentui/react/lib/Modal';
import { Text } from '@fluentui/react/lib/Text';
import { css, getId } from '@fluentui/react/lib/Utilities';
import { AltTextDialog } from './AltTextDialog';
import { AreaPropertiesInline, AreaPropertiesPanel, FIRST_FIELD_CLASS, PropertiesTab } from './AreaPropertiesPanel';
import { EditorTool, EditorToolbar } from './EditorToolbar';
import { ImageMapViewer } from './ImageMapViewer';
import { ImagePickerPanel } from './ImagePickerPanel';
import { QuickActions } from './QuickActions';
import { useClassNames } from './styles';
import { ISecurityPolicy } from '../config/securityConfig';
import { useAreaHistory } from '../hooks/useAreaHistory';
import { strings } from '../loc/strings';
import { AreaShape, IHoverStyle, IImageArea } from '../models/IImageMap';
import { ImageService } from '../services/ImageService';
import { PageService } from '../services/PageService';
import { formatNumber } from '../utils/format';
import {
  circleFromDrag, circleFromWidth, createArea, findAttribute, IPoint, IRect, MIN_DRAW_SIZE, moveRect, normalizeRect,
  normalizeShapeRect, rectFromPoints, resizeCircle, resizeRect, ResizeHandle, RESIZE_HANDLES, round2, toPercentPoint, toRect
} from '../utils/geometry';
import { getEditAreaClass } from '../utils/hoverStyles';
import { checkImageUrl, collectIssues, IValidationIssue } from '../utils/validation';

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

const CORNER_HANDLES: ResizeHandle[] = ['nw', 'ne', 'se', 'sw'];
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

/** Tool for a single-key shortcut of the current language (e.g. K = circle in German, C in English/French). */
function toolForKey(key: string): EditorTool | undefined {
  const keys = strings.toolKeys;
  const tools: EditorTool[] = ['select', 'rect', 'circle', 'ellipse'];
  return tools.filter((t: EditorTool) => keys[t].toLowerCase() === (key || '').toLowerCase())[0];
}

const fmt = (n: number): string => formatNumber(n);

function describeRect(r: IRect, shape?: string): string {
  const size = shape === 'circle' ? strings.circleDiameter(fmt(r.width)) : strings.rectSize(fmt(r.width), fmt(r.height));
  return `${strings.rectPosition(fmt(r.x), fmt(r.y))}, ${size}`;
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
  const classNames = useClassNames();
  const {
    areas, policy, onAreasChange, imageUrl, imageAlt, defaultHover, service, uploadFolder, onImageChange,
    onImageAltChange, pageService, onDefaultHoverChange, stretch, hintAreas, showLinkList
  } = props;

  // ---------- Refs (always current state – the CommandBar caches handlers) ----------
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

  // ---------- State ----------
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

  /** Screen reader announcement. Identical texts are re-announced via an invisible character. */
  const announce = (message: string) => {
    setAnnouncement((prev: string) => (prev === message ? message + ' ' : message));
  };

  const history = useAreaHistory(latest, onAreasChange, announce);

  React.useEffect(() => { setImageFailed(false); }, [imageUrl]);

  // Set focus deliberately (new area, delete, panel closed, full screen exited …)
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

  // Adapt circles to a new aspect ratio (e.g. after changing the image) – without an undo step
  React.useEffect(() => {
    const current = latest();
    if (current.some((a: IImageArea) => a.shape === 'circle' && Math.abs(a.height - a.width * imageRatio) > 0.05)) {
      onAreasChange(current.map((a: IImageArea) =>
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

  const issues = collectIssues(areas, imageAlt, policy);
  const areaIssues: { [id: string]: string[] } = {};
  issues.forEach((issue: IValidationIssue) => {
    if (issue.areaId) { (areaIssues[issue.areaId] = areaIssues[issue.areaId] || []).push(issue.message); }
  });
  const limitReached = areas.length >= policy.maxAreas;

  // ---------------- Tools ----------------
  const setTool = (next: EditorTool) => {
    setToolState(next);
    announce(next === 'select' ? strings.announceToolSelect : strings.announceTool(strings.toolNames[next]));
  };

  // ---------------- Data changes (all via history → undo possible) ----------------
  const updateArea = (id: string, changes: Partial<IImageArea>, label: string, coalesceKey?: string) => {
    history.commit(latest().map((a: IImageArea) => (a.id === id ? { ...a, ...changes } : a)), label, coalesceKey);
  };

  const addArea = (rect: IRect, shape: AreaShape, drawn: boolean) => {
    const current = latest();
    if (current.length >= policy.maxAreas) {
      announce(strings.maxAreasReached(policy.maxAreas));
      return;
    }
    const area = createArea(rect, defaultHover, shape, getRatio());
    history.commit(current.concat([area]), strings.labelShapeAdded(strings.shapeNames[shape], drawn));
    setSelectedId(area.id);
    setPropsTab('link');
    setPanelOpen(true);
    if (stateRef.current.fullscreen) { setFocusTarget('#first-field'); }
    announce(strings.announceShapeAdded(strings.shapeNames[shape], current.length + 1, drawn));
  };

  const insertCentered = (shape: AreaShape) => {
    const ratio = getRatio();
    const rect = shape === 'circle'
      ? circleFromWidth(40, 50 - (20 * ratio) / 2, 20, ratio)
      : { x: 40, y: 40, width: 20, height: 20 };
    addArea(rect, shape, false);
    setToolState('select');
  };

  const duplicateArea = (area: IImageArea) => {
    const current = latest();
    if (current.length >= policy.maxAreas) { announce(strings.maxAreasReached(policy.maxAreas)); return; }
    const copy = { ...createArea(moveRect(toRect(area), 2, 2), area.hover, area.shape, getRatio()), url: area.url, title: area.title, tooltip: area.tooltip, openInNewTab: area.openInNewTab };
    history.commit(current.concat([copy]), strings.labelDuplicated);
    setSelectedId(copy.id);
    setFocusTarget(copy.id);
    announce(strings.announceDuplicated(current.length + 1));
  };

  const deleteArea = (id: string) => {
    const current = latest();
    const index = indexOf(id, current);
    if (index < 0) { return; }
    const remaining = current.filter((a: IImageArea) => a.id !== id);
    history.commit(remaining, strings.labelDeleted(index + 1));
    setPanelOpen(false);
    announce(strings.announceDeleted(index + 1, remaining.length));
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
    history.commit(copy, strings.labelReordered);
    announce(strings.announceReordered(target + 1, copy.length));
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
    announce(next ? strings.announceFullscreenOn : strings.announceFullscreenOff);
  };

  // ---------------- Pointer (mouse, pen, touch) ----------------
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const surface = surfaceRef.current;
    if (testMode || e.button !== 0 || !surface) { return; }
    const target = e.target as HTMLElement;
    if (findAttribute(target, 'data-ui', surface)) { return; } // Quick actions

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
    try { surface.setPointerCapture(e.pointerId); } catch { /* not supported */ }
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
    try { if (surface) { surface.releasePointerCapture(e.pointerId); } } catch { /* ignore */ }
    setDrag(null);
    if (e.type === 'pointercancel' || !d.moved) { return; }
    if (d.mode === 'draw') {
      if (d.rect.width >= MIN_DRAW_SIZE && d.rect.height >= MIN_DRAW_SIZE) {
        addArea(d.rect, d.shape, true);
        setToolState('select'); // like in Office: return to "Select" after drawing
      }
    } else if (d.areaId) {
      const rect = normalizeShapeRect(d.rect, d.shape, getRatio());
      updateArea(d.areaId, rect, d.mode === 'move' ? strings.labelMoved : strings.labelResized);
      announce(d.mode === 'move' ? strings.announceMoved(describeRect(rect, d.shape)) : strings.announceResized(describeRect(rect, d.shape)));
    }
  };

  const onDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const surface = surfaceRef.current;
    if (testMode || !surface || findAttribute(e.target as HTMLElement, 'data-ui', surface)) { return; }
    const areaId = findAttribute(e.target as HTMLElement, 'data-area-id', surface);
    if (areaId) { openProperties(areaId); }
  };

  // ---------------- Keyboard ----------------
  /** Editor-wide: undo/redo (not in text fields – native undo applies there). */
  const onEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (stateRef.current.testMode || isTextInput(e.target)) { return; }
    const key = (e.key || '').toLowerCase();
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      if (key === 'z' && !e.shiftKey) { e.preventDefault(); history.undo(); }
      else if (key === 'y' || (key === 'z' && e.shiftKey)) { e.preventDefault(); history.redo(); }
    }
  };

  /**
   * Canvas: tool shortcuts V/R/K/E and Enter to insert.
   * Single-key shortcuts work ONLY when focus is on the canvas or an area (WCAG 2.1.4).
   */
  const onSurfaceKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const surface = surfaceRef.current;
    if (!surface || stateRef.current.testMode || e.ctrlKey || e.metaKey || e.altKey) { return; }
    if (findAttribute(e.target as HTMLElement, 'data-ui', surface)) { return; }
    const nextTool = (e.key || '').length === 1 ? toolForKey(e.key) : undefined;
    if (nextTool) {
      e.preventDefault();
      setTool(nextTool);
      return;
    }
    if (e.key === 'Enter' && e.target === surface) {
      e.preventDefault();
      const current = toolRef.current;
      if (current === 'select') {
        announce(strings.announceChooseShapeFirst);
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
        label = strings.labelResized;
        announce(strings.announceDiameter(fmt(rect.width)));
      } else if (e.ctrlKey || e.metaKey) {
        rect = normalizeRect({ x: area.x, y: area.y, width: round2(area.width + arrow[0] * step), height: round2(area.height + arrow[1] * step) });
        label = strings.labelResized;
        announce(strings.announceSize(fmt(rect.width), fmt(rect.height)));
      } else {
        rect = normalizeShapeRect(moveRect(toRect(area), arrow[0] * step, arrow[1] * step), area.shape, getRatio());
        label = strings.labelMoved;
        announce(`${strings.rectPosition(fmt(rect.x), fmt(rect.y))}.`);
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
        // Close the panel first; otherwise Esc may exit full screen.
        if (stateRef.current.panelOpen) {
          e.preventDefault();
          e.stopPropagation();
          closeProperties();
        }
        break;
    }
  };

  // ---------------- Parts ----------------
  const picker = (
    <ImagePickerPanel
      isOpen={pickerOpen}
      service={service}
      policy={policy}
      folder={uploadFolder}
      currentUrl={imageUrl}
      hasAreas={areas.length > 0}
      onSelect={(url: string) => { onImageChange(url); setPickerOpen(false); announce(strings.announceImageApplied); }}
      onDismiss={() => setPickerOpen(false)}
    />
  );
  const altDialog = (
    <AltTextDialog
      isOpen={altOpen}
      value={imageAlt}
      maxLength={policy.maxAltLength}
      onSave={(alt: string) => { onImageAltChange(alt); setAltOpen(false); announce(strings.announceAltSaved); }}
      onDismiss={() => setAltOpen(false)}
    />
  );
  const liveRegion = <div className={classNames.srOnly} role="status" aria-live="polite" aria-atomic="true">{announcement}</div>;

  if (!imageUrl) {
    return (
      <div className={classNames.placeholder}>
        <Icon iconName="Photo2" className={classNames.placeholderIcon} aria-hidden={true} />
        <Text block={true} variant="large" style={{ margin: '8px 0' }}>{strings.placeholderTitle}</Text>
        <Text block={true} style={{ marginBottom: 16 }}>{strings.placeholderText}</Text>
        <PrimaryButton text={strings.chooseImage} iconProps={{ iconName: 'Photo2' }} onClick={() => setPickerOpen(true)} />
        {picker}
        {liveRegion}
      </div>
    );
  }

  const imageCheck = checkImageUrl(imageUrl, policy);

  const formProps = selected ? {
    area: selected,
    index: selectedIndex,
    policy,
    pageService: pageService,
    imageRatio,
    tab: propsTab,
    onTabChange: setPropsTab,
    onChange: (changes: Partial<IImageArea>, label: string, coalesceKey?: string) => updateArea(selected.id, changes, label, coalesceKey),
    onApplyHoverToAll: (hover: IHoverStyle) => {
      history.commit(latest().map((a: IImageArea) => ({ ...a, hover: { ...hover } })), strings.labelStyleAppliedToAll);
      announce(strings.announceStyleAppliedToAll);
    },
    onSaveAsDefaultHover: (hover: IHoverStyle) => {
      onDefaultHoverChange({ ...hover });
      announce(strings.announceSavedAsDefault);
    },
    onAnnounce: announce
  } : undefined;

  const canvas = (
    <div className={classNames.canvasCol}>
      <Text block={true} variant="small" className={classNames.hint} id={ids.current.help}>{strings.editorHelp}</Text>
      {imageFailed && <MessageBar messageBarType={MessageBarType.error}>{strings.imageLoadFailed}</MessageBar>}
      <div className={css(classNames.outer, stretch && classNames.outerStretch)}>
        {/* The drawing surface is a custom widget (role="application") operated with pointer and keyboard. */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
        <div
          ref={surfaceRef}
          className={css(classNames.frame, stretch && classNames.frameStretch, classNames.surface)}
          style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- the surface must be reachable by keyboard
          tabIndex={0}
          role="application"
          aria-roledescription={strings.canvasRoleDescription}
          aria-label={strings.canvasLabel(strings.toolNames[tool], areas.length)}
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
              className={css(classNames.image, stretch && classNames.imageStretch)}
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
            const label = strings.areaAriaLabel(index + 1, strings.shapeNames[area.shape], area.title || strings.untitled, describeRect(area, area.shape)) +
              (problems ? ` ${strings.problemCount(problems.length)}.` : '');
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
                  title={area.tooltip || area.title || strings.untitled}
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

      <h3 className={classNames.listHeading} id={ids.current.list}>{strings.listHeading(areas.length)}</h3>
      {areas.length === 0 ? (
        <Text variant="small">{strings.noAreas}</Text>
      ) : (
        <ul className={classNames.list} aria-labelledby={ids.current.list}>
          {areas.map((area: IImageArea, index: number) => {
            const problems = areaIssues[area.id];
            const name = area.title || strings.untitled;
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
                    {problems && <Icon iconName="Warning" className={classNames.issueIcon} aria-hidden={true} title={problems.join(' ')} />}
                    <span className={classNames.srOnly}>{strings.area(index + 1)}, {strings.shapeNames[area.shape]}: </span>
                    {name} – {area.url || strings.noLinkLower}
                    {area.openInNewTab && <span aria-hidden={true}> ↗</span>}
                    {area.openInNewTab && <span className={classNames.srOnly}>{strings.newTabShort}</span>}
                    {problems && <span className={classNames.srOnly}> {strings.errorsPrefix} {problems.join(' ')}</span>}
                  </span>
                </button>
                <IconButton iconProps={{ iconName: 'ChevronUp' }} title={strings.moveForwardTitle}
                  ariaLabel={strings.moveForwardAria(index + 1)} disabled={index === 0} onClick={() => moveInOrder(index, -1)} />
                <IconButton iconProps={{ iconName: 'ChevronDown' }} title={strings.moveBackwardTitle}
                  ariaLabel={strings.moveBackwardAria(index + 1)} disabled={index === areas.length - 1} onClick={() => moveInOrder(index, 1)} />
                <IconButton iconProps={{ iconName: 'Edit' }} title={strings.edit}
                  ariaLabel={strings.editAreaAria(index + 1, name)} onClick={() => openProperties(area.id)} />
                <IconButton iconProps={{ iconName: 'Delete' }} title={strings.delete}
                  ariaLabel={strings.deleteAreaNamedAria(index + 1, name)} onClick={() => deleteArea(area.id)} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  const body = (
    // role="presentation": the container only catches keyboard shortcuts bubbling up from its content.
    <div className={classNames.editor} role="presentation" onKeyDown={onEditorKeyDown} style={fullscreen ? { border: 'none', height: '100%', display: 'flex', flexDirection: 'column' } : undefined}>
      {liveRegion}
      <EditorToolbar
        tool={tool}
        hasImage={!!imageUrl}
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
        onSort={() => { history.commit(sortByReadingOrder(latest()), strings.labelSorted); announce(strings.announceSorted); }}
        onToggleTest={() => {
          const next = !stateRef.current.testMode;
          setTestMode(next);
          setTestMessage(undefined);
          setPanelOpen(false);
          announce(next ? strings.announcePreviewOn : strings.announceEditing);
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
        <MessageBar messageBarType={MessageBarType.blocked}>{strings.imageNotAllowed(imageCheck.error || '')}</MessageBar>
      )}

      {testMode ? (
        <div style={{ padding: 8, overflow: 'auto' }}>
          <div role="status" aria-live="polite">
            <MessageBar messageBarType={MessageBarType.info}>
              {testMessage || strings.previewInfo}
            </MessageBar>
          </div>
          <div style={{ marginTop: 8 }}>
            <ImageMapViewer
              imageUrl={imageUrl}
              imageAlt={imageAlt}
              areas={areas}
              stretch={stretch}
              hintAreas={hintAreas}
              showLinkList={showLinkList}
              policy={policy}
              onPreviewClick={(a: IImageArea) => setTestMessage(
                strings.previewClick(a.title || strings.untitled, a.url, a.openInNewTab))}
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
      <div className={classNames.fullscreenNote}>{strings.fullscreenNote}</div>
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
        <h2 id={ids.current.modalTitle} className={classNames.srOnly}>{strings.fullscreenTitle}</h2>
        {body}
      </Modal>
    </div>
  );
};
