import * as React from 'react';
import { CommandBar, ICommandBarData, ICommandBarItemProps } from '@fluentui/react/lib/CommandBar';
import { ContextualMenuItemType } from '@fluentui/react/lib/ContextualMenu';
import { VerticalDivider } from '@fluentui/react/lib/Divider';
import { AreaShape } from '../models/IImageMap';
import { IssuesButton } from './IssuesButton';
import { IValidationIssue } from '../utils/validation';
import { strings } from '../loc/strings';

export type EditorTool = 'select' | AreaShape;

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

/** Marks items that may move into the "…" menu when space is limited (from last to first). */
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
 * Responsive behavior when space is limited:
 *  1. Hide labels (icons only, name remains as aria-label/tooltip)
 *  2. Move items from the end into the "…" menu (tools stay visible the longest)
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
 * Toolbar in Fluent design (CommandBar).
 * Keyboard: Tab moves into the bar, left/right arrow keys switch between items,
 * Enter/Space triggers, down arrow opens submenus. The tools form a
 * radio group (menuitemradio + aria-checked).
 */
export const EditorToolbar: React.FunctionComponent<IEditorToolbarProps> = (props: IEditorToolbarProps) => {
  // The state is included in the keys so the CommandBar does not render stale items from its cache.
  const v = [props.tool, props.canUndo, props.canRedo, props.testMode, props.fullscreen, props.hasImage, props.issues.length].join('-');
  const editing = props.hasImage && !props.testMode;

  const toolItem = (tool: EditorTool): ICommandBarItemProps => {
    const checked = props.tool === tool;
    return {
      key: `tool-${tool}-${v}`,
      text: strings.toolNames[tool],
      title: tool === 'select'
        ? strings.selectTitle(strings.toolKeys[tool])
        : strings.drawTitle(strings.toolNames[tool], strings.toolKeys[tool]),
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
      text: strings.image,
      iconProps: { iconName: 'Photo2' },
      subMenuProps: {
        items: [
          { key: 'choose', text: props.hasImage ? strings.changeImageMenu : strings.chooseImageMenu, iconProps: { iconName: 'Photo2' }, onClick: () => props.onChooseImage() },
          { key: 'alt', text: strings.editAltMenu, iconProps: { iconName: 'TextField' }, disabled: !props.hasImage, onClick: () => props.onEditAlt() }
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
      text: strings.undo,
      iconOnly: true,
      ariaLabel: props.undoLabel ? strings.undoWith(props.undoLabel) : strings.undo,
      title: strings.undoTitle(props.undoLabel),
      iconProps: { iconName: 'Undo' },
      disabled: !props.canUndo || props.testMode,
      onClick: () => props.onUndo(),
      data: { collapsible: true } as ICollapsible
    },
    {
      key: `redo-${v}`,
      text: strings.redo,
      iconOnly: true,
      ariaLabel: props.redoLabel ? strings.redoWith(props.redoLabel) : strings.redo,
      title: strings.redoTitle(props.redoLabel),
      iconProps: { iconName: 'Redo' },
      disabled: !props.canRedo || props.testMode,
      onClick: () => props.onRedo(),
      data: { collapsible: true } as ICollapsible
    }
  ];

  const overflowItems: ICommandBarItemProps[] = [
    {
      key: `insert-${v}`,
      text: strings.insertArea,
      iconProps: { iconName: 'Add' },
      disabled: !editing || props.limitReached,
      subMenuProps: {
        items: (['rect', 'circle', 'ellipse'] as AreaShape[]).map((shape: AreaShape) => ({
          key: shape,
          text: strings.insertCentered(strings.toolNames[shape]),
          onClick: () => props.onInsert(shape)
        }))
      }
    },
    {
      key: `sort-${v}`,
      text: strings.sortOrder,
      title: strings.sortOrderTitle,
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
      text: props.testMode ? strings.edit : strings.preview,
      title: props.testMode ? strings.backToEditTitle : strings.previewTitle,
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
      text: props.fullscreen ? strings.exitFullscreen : strings.fullscreen,
      iconOnly: true,
      title: props.fullscreen ? strings.exitFullscreenTooltip : strings.fullscreenTooltip,
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
      ariaLabel={strings.toolbarAria}
      overflowButtonProps={{ ariaLabel: strings.moreCommands, title: strings.moreCommands }}
      styles={{ root: { padding: '0 4px', height: 40 } }}
    />
  );
};
