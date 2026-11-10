import * as React from 'react';
import { CommandBar, ICommandBarData, ICommandBarItemProps } from '@fluentui/react/lib/CommandBar';
import { ContextualMenuItemType } from '@fluentui/react/lib/ContextualMenu';
import { VerticalDivider } from '@fluentui/react/lib/Divider';
import { AreaShape } from '../models/IImageMap';
import { IssuesButton } from './IssuesButton';
import { IValidationIssue } from '../utils/validation';

export type EditorTool = 'select' | AreaShape;

export const TOOL_NAMES: { [key: string]: string } = {
  select: 'Auswählen', rect: 'Rechteck', circle: 'Kreis', ellipse: 'Ellipse'
};
export const TOOL_SHORTCUTS: { [key: string]: string } = {
  select: 'V', rect: 'R', circle: 'K', ellipse: 'E'
};
const TOOL_ICONS: { [key: string]: string } = {
  select: 'TouchPointer', rect: 'RectangleShape', circle: 'CircleRing', ellipse: 'Ellipse'
};

export interface IEditorToolbarProps {
  tool: EditorTool;
  hasImage: boolean;
  testMode: boolean;
  fullscreen: boolean;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel?: string;
  redoLabel?: string;
  canSort: boolean;
  limitReached: boolean;
  issues: IValidationIssue[];
  onToolChange: (tool: EditorTool) => void;
  onInsert: (shape: AreaShape) => void;
  onChooseImage: () => void;
  onEditAlt: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSort: () => void;
  onToggleTest: () => void;
  onToggleFullscreen: () => void;
  onIssueSelect: (issue: IValidationIssue) => void;
}

/** Markiert Einträge, die bei Platzmangel ins „…“-Menü wandern dürfen (von hinten nach vorn). */
interface ICollapsible { collapsible?: boolean; }

function divider(key: string): ICommandBarItemProps {
  return {
    key,
    itemType: ContextualMenuItemType.Divider,
    onRender: () => <VerticalDivider styles={{ wrapper: { height: 40, padding: '8px 4px' }, divider: { height: '100%' } }} />,
    data: { collapsible: true } as ICollapsible
  };
}

function cacheKeyOf(data: ICommandBarData, iconOnly: boolean): string {
  return [
    iconOnly ? 'i' : 't',
    data.primaryItems.map((i: ICommandBarItemProps) => i.key).join(','),
    data.overflowItems.map((i: ICommandBarItemProps) => i.key).join(',')
  ].join('|');
}

/**
 * Responsives Verhalten bei wenig Platz:
 *  1. Beschriftungen ausblenden (nur Icons, Name bleibt als aria-label/Tooltip erhalten)
 *  2. Einträge von hinten ins „…“-Menü verschieben (Werkzeuge bleiben am längsten sichtbar)
 */
function onReduceData(data: ICommandBarData): ICommandBarData | undefined {
  if (data.primaryItems.some((i: ICommandBarItemProps) => !!i.text && !i.iconOnly)) {
    const reduced = { ...data, primaryItems: data.primaryItems.map((i: ICommandBarItemProps) => ({ ...i, iconOnly: true })) };
    return { ...reduced, cacheKey: cacheKeyOf(reduced, true) };
  }
  let index = -1;
  data.primaryItems.forEach((i: ICommandBarItemProps, n: number) => {
    if (i.data && (i.data as ICollapsible).collapsible) { index = n; }
  });
  if (index < 0) { return undefined; }
  const moved = data.primaryItems[index];
  const reduced = {
    ...data,
    primaryItems: data.primaryItems.filter((_: ICommandBarItemProps, n: number) => n !== index),
    overflowItems: ([{ ...moved, iconOnly: false }] as ICommandBarItemProps[]).concat(data.overflowItems)
  };
  return { ...reduced, cacheKey: cacheKeyOf(reduced, true) };
}

function onGrowData(data: ICommandBarData): ICommandBarData | undefined {
  const first = data.overflowItems[0];
  if (first && first.data && (first.data as ICollapsible).collapsible) {
    const insertAt = data.primaryItems.length;
    const grown = {
      ...data,
      primaryItems: data.primaryItems.slice(0, insertAt).concat([{ ...first, iconOnly: true }]),
      overflowItems: data.overflowItems.slice(1)
    };
    return { ...grown, cacheKey: cacheKeyOf(grown, true) };
  }
  if (data.primaryItems.some((i: ICommandBarItemProps) => i.iconOnly && !!i.text)) {
    const grown = { ...data, primaryItems: data.primaryItems.map((i: ICommandBarItemProps) => ({ ...i, iconOnly: false })) };
    return { ...grown, cacheKey: cacheKeyOf(grown, false) };
  }
  return undefined;
}

/**
 * Werkzeugleiste im Fluent-Design (CommandBar).
 * Tastatur: Tab springt in die Leiste, Pfeiltasten links/rechts wechseln zwischen den Einträgen,
 * Enter/Leertaste löst aus, Pfeil runter öffnet Untermenüs. Die Werkzeuge bilden eine
 * Optionsgruppe (menuitemradio + aria-checked).
 */
export const EditorToolbar: React.FunctionComponent<IEditorToolbarProps> = (props: IEditorToolbarProps) => {
  // Der Zustand fließt in die Keys ein, damit die CommandBar keine veralteten Einträge aus ihrem Cache rendert.
  const v = [props.tool, props.canUndo, props.canRedo, props.testMode, props.fullscreen, props.hasImage, props.issues.length].join('-');
  const editing = props.hasImage && !props.testMode;

  const toolItem = (tool: EditorTool): ICommandBarItemProps => {
    const checked = props.tool === tool;
    return {
      key: `tool-${tool}-${v}`,
      text: TOOL_NAMES[tool],
      title: tool === 'select'
        ? `Auswählen (${TOOL_SHORTCUTS[tool]})`
        : `${TOOL_NAMES[tool]} zeichnen (${TOOL_SHORTCUTS[tool]}). Per Tastatur: Enter auf der Zeichenfläche fügt ein.`,
      iconProps: { iconName: TOOL_ICONS[tool] },
      disabled: !editing,
      canCheck: true,
      checked,
      role: 'menuitemradio',
      'aria-checked': checked,
      onClick: () => props.onToolChange(tool)
    };
  };

  const items: ICommandBarItemProps[] = [
    {
      key: `image-${v}`,
      text: 'Bild',
      iconProps: { iconName: 'Photo2' },
      subMenuProps: {
        items: [
          { key: 'choose', text: props.hasImage ? 'Bild ändern …' : 'Bild auswählen …', iconProps: { iconName: 'Photo2' }, onClick: () => props.onChooseImage() },
          { key: 'alt', text: 'Alternativtext bearbeiten …', iconProps: { iconName: 'TextField' }, disabled: !props.hasImage, onClick: () => props.onEditAlt() }
        ]
      }
    },
    divider(`d1-${v}`),
    toolItem('select'),
    toolItem('rect'),
    toolItem('circle'),
    toolItem('ellipse'),
    divider(`d2-${v}`),
    {
      key: `undo-${v}`,
      text: 'Rückgängig',
      iconOnly: true,
      ariaLabel: props.undoLabel ? `Rückgängig: ${props.undoLabel}` : 'Rückgängig',
      title: props.undoLabel ? `Rückgängig: ${props.undoLabel} (Strg+Z)` : 'Rückgängig (Strg+Z)',
      iconProps: { iconName: 'Undo' },
      disabled: !props.canUndo || props.testMode,
      onClick: () => props.onUndo(),
      data: { collapsible: true } as ICollapsible
    },
    {
      key: `redo-${v}`,
      text: 'Wiederholen',
      iconOnly: true,
      ariaLabel: props.redoLabel ? `Wiederholen: ${props.redoLabel}` : 'Wiederholen',
      title: props.redoLabel ? `Wiederholen: ${props.redoLabel} (Strg+Y)` : 'Wiederholen (Strg+Y)',
      iconProps: { iconName: 'Redo' },
      disabled: !props.canRedo || props.testMode,
      onClick: () => props.onRedo(),
      data: { collapsible: true } as ICollapsible
    }
  ];

  const overflowItems: ICommandBarItemProps[] = [
    {
      key: `insert-${v}`,
      text: 'Bereich einfügen',
      iconProps: { iconName: 'Add' },
      disabled: !editing || props.limitReached,
      subMenuProps: {
        items: (['rect', 'circle', 'ellipse'] as AreaShape[]).map((shape: AreaShape) => ({
          key: shape,
          text: `${TOOL_NAMES[shape]} in der Bildmitte`,
          onClick: () => props.onInsert(shape)
        }))
      }
    },
    {
      key: `sort-${v}`,
      text: 'Lesereihenfolge sortieren',
      title: 'Bereiche von oben links nach unten rechts sortieren (Tab-Reihenfolge)',
      iconProps: { iconName: 'SortLines' },
      disabled: !editing || !props.canSort,
      onClick: () => props.onSort()
    }
  ];

  const farItems: ICommandBarItemProps[] = [
    {
      key: `issues-${v}`,
      onRender: () => <IssuesButton issues={props.issues} onSelect={props.onIssueSelect} />
    },
    {
      key: `test-${v}`,
      text: props.testMode ? 'Bearbeiten' : 'Vorschau',
      title: props.testMode ? 'Zurück zum Bearbeiten' : 'Vorschau testen: Links werden angezeigt, aber nicht geöffnet',
      iconProps: { iconName: props.testMode ? 'Edit' : 'Play' },
      disabled: !props.hasImage,
      canCheck: true,
      checked: props.testMode,
      role: 'menuitemcheckbox',
      'aria-checked': props.testMode,
      onClick: () => props.onToggleTest()
    },
    {
      key: `full-${v}`,
      text: props.fullscreen ? 'Vollbild beenden' : 'Vollbild',
      iconOnly: true,
      title: props.fullscreen ? 'Vollbild beenden (Esc)' : 'Im Vollbild bearbeiten',
      iconProps: { iconName: props.fullscreen ? 'BackToWindow' : 'FullScreen' },
      disabled: !props.hasImage,
      onClick: () => props.onToggleFullscreen()
    }
  ];

  return (
    <CommandBar
      items={items}
      overflowItems={overflowItems}
      farItems={farItems}
      onReduceData={onReduceData}
      onGrowData={onGrowData}
      ariaLabel="Werkzeuge für Bildbereiche. Pfeiltasten wechseln zwischen den Einträgen."
      overflowButtonProps={{ ariaLabel: 'Weitere Befehle', title: 'Weitere Befehle' }}
      styles={{ root: { padding: '0 4px', height: 40 } }}
    />
  );
};
