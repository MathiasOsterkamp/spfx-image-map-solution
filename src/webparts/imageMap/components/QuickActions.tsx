import * as React from 'react';
import { IconButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import { handleRovingKeyDown, initRovingTabIndex } from '../utils/rovingFocus';
import { mergeStyleSets } from '@fluentui/react/lib/Styling';
import { ITheme, useTheme } from '@fluentui/react/lib/Theme';
import { memoizeFunction } from '@fluentui/react/lib/Utilities';
import { IImageArea } from '../models/IImageMap';
import * as strings from 'ImageMapWebPartStrings';

const getCss = memoizeFunction((theme: ITheme) => mergeStyleSets({
  bar: {
    position: 'absolute',
    zIndex: 5,
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    padding: 2,
    lineHeight: 'normal',
    whiteSpace: 'nowrap',
    background: theme.palette.white,
    border: `1px solid ${theme.palette.neutralTertiaryAlt}`,
    borderRadius: 4,
    boxShadow: theme.effects.elevation8,
    cursor: 'default'
  },
  target: {
    display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth: 220, padding: '0 6px',
    fontSize: 12, color: theme.palette.neutralSecondary, overflow: 'hidden', textOverflow: 'ellipsis'
  }
}));

export interface IQuickActionsProps {
  area: IImageArea;
  index: number;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  /** Esc: back to the area */
  onEscape: () => void;
}

/**
 * Quick actions on the selected area (ARIA toolbar pattern).
 * Placed in the DOM directly after the area: ONE tab stop, arrow keys switch between
 * the buttons, Esc jumps back to the area.
 */
export const QuickActions: React.FunctionComponent<IQuickActionsProps> = (props: IQuickActionsProps) => {
  const css = getCss(useTheme());
  const { area, index, onEscape, onEdit, onDuplicate, onDelete } = props;
  const a = area;
  const barRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { initRovingTabIndex(barRef.current); }, [a.id]);
  const below = a.y + a.height < 82;
  const style: React.CSSProperties = below
    ? { left: `${a.x}%`, top: `calc(${a.y + a.height}% + 8px)` }
    : { left: `${a.x}%`, bottom: `calc(${100 - a.y}% + 8px)` };

  return (
    <div
      ref={barRef}
      className={css.bar}
      style={style}
      role="toolbar"
      aria-label={strings.actionsFor(index + 1)}
      data-ui="quick-actions"
      onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); e.stopPropagation(); onEscape(); return; }
        handleRovingKeyDown(e, 'horizontal');
      }}
    >
      <span className={css.target} title={a.url || strings.noLink} aria-label={a.url ? strings.targetAria(a.url) : strings.noLinkSet} role="note">
        <Icon iconName="Link" aria-hidden={true} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.url || strings.noLink}</span>
      </span>
      <IconButton iconProps={{ iconName: 'Edit' }} title={strings.propertiesShortcut} ariaLabel={strings.editNumberedAria(index + 1)} onClick={onEdit} />
      <IconButton iconProps={{ iconName: 'Copy' }} title={strings.duplicateShortcut} ariaLabel={strings.duplicateAria(index + 1)} onClick={onDuplicate} />
      <IconButton iconProps={{ iconName: 'Delete' }} title={strings.deleteShortcut} ariaLabel={strings.deleteAreaAria(index + 1)} onClick={onDelete} />
    </div>
  );
};
