import * as React from 'react';
import { CommandBar, ICommandBarData, ICommandBarItemProps } from '@fluentui/react/lib/CommandBar';
import { ContextualMenuItemType } from '@fluentui/react/lib/ContextualMenu';
import { VerticalDivider } from '@fluentui/react/lib/Divider';
import { IssuesButton } from './IssuesButton';
import { strings } from '../loc/strings';
import { AreaShape } from '../models/IImageMap';
import { IValidationIssue } from '../utils/validation';

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
  const {
    tool, canUndo, canRedo, testMode, fullscreen, hasImage, issues, onToolChange, onChooseImage, onEditAlt,
    undoLabel, onUndo, redoLabel, onRedo, limitReached, onInsert, canSort, onSort, onIssueSelect, onToggleTest,
    onToggleFullscreen
  } = props;
  // The state is included in the keys so the CommandBar does not render stale items from its cache.
  const v = [tool, canUndo, canRedo, testMode, fullscreen, hasImage, issues.length].join('-');
  const editing = hasImage && !testMode;

  const toolItem = (item: EditorTool): ICommandBarItemProps => {
    const checked = tool === item;
    return {
      key: `tool-${item}-${v}`,
      text: strings.toolNames[item],
      title: item === 'select'
        ? strings.selectTitle(strings.toolKeys[item])
        : strings.drawTitle(strings.toolNames[item], strings.toolKeys[item]),
      iconProps: { iconName: TOOL_ICONS[item] },
      disabled: !editing,
      canCheck: true,
      checked,
      role: 'menuitemradio',
      'aria-checked': checked,
      onClick: () => onToolChange(item)
    };
  };

  const items: ICommandBarItemProps[] = [
    {
      key: `image-${v}`,
      text: strings.image,
      iconProps: { iconName: 'Photo2' },
      subMenuProps: {
        items: [
          { key: 'choose', text: hasImage ? strings.changeImageMenu : strings.chooseImageMenu, iconProps: { iconName: 'Photo2' }, onClick: () => onChooseImage() },
          { key: 'alt', text: strings.editAltMenu, iconProps: { iconName: 'TextField' }, disabled: !hasImage, onClick: () => onEditAlt() }
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
      ariaLabel: undoLabel ? strings.undoWith(undoLabel) : strings.undo,
      title: strings.undoTitle(undoLabel),
      iconProps: { iconName: 'Undo' },
      disabled: !canUndo || testMode,
      onClick: () => onUndo(),
      data: { collapsible: true } as ICollapsible
    },
    {
      key: `redo-${v}`,
      text: strings.redo,
      iconOnly: true,
      ariaLabel: redoLabel ? strings.redoWith(redoLabel) : strings.redo,
      title: strings.redoTitle(redoLabel),
      iconProps: { iconName: 'Redo' },
      disabled: !canRedo || testMode,
      onClick: () => onRedo(),
      data: { collapsible: true } as ICollapsible
    }
  ];

  const overflowItems: ICommandBarItemProps[] = [
    {
      key: `insert-${v}`,
      text: strings.insertArea,
      iconProps: { iconName: 'Add' },
      disabled: !editing || limitReached,
      subMenuProps: {
        items: (['rect', 'circle', 'ellipse'] as AreaShape[]).map((shape: AreaShape) => ({
          key: shape,
          text: strings.insertCentered(strings.toolNames[shape]),
          onClick: () => onInsert(shape)
        }))
      }
    },
    {
      key: `sort-${v}`,
      text: strings.sortOrder,
      title: strings.sortOrderTitle,
      iconProps: { iconName: 'SortLines' },
      disabled: !editing || !canSort,
      onClick: () => onSort()
    }
  ];

  const farItems: ICommandBarItemProps[] = [
    {
      key: `issues-${v}`,
      onRender: () => <IssuesButton issues={issues} onSelect={onIssueSelect} />
    },
    {
      key: `test-${v}`,
      text: testMode ? strings.edit : strings.preview,
      title: testMode ? strings.backToEditTitle : strings.previewTitle,
      iconProps: { iconName: testMode ? 'Edit' : 'Play' },
      disabled: !hasImage,
      canCheck: true,
      checked: testMode,
      role: 'menuitemcheckbox',
      'aria-checked': testMode,
      onClick: () => onToggleTest()
    },
    {
      key: `full-${v}`,
      text: fullscreen ? strings.exitFullscreen : strings.fullscreen,
      iconOnly: true,
      title: fullscreen ? strings.exitFullscreenTooltip : strings.fullscreenTooltip,
      iconProps: { iconName: fullscreen ? 'BackToWindow' : 'FullScreen' },
      disabled: !hasImage,
      onClick: () => onToggleFullscreen()
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
