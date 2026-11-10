import * as React from 'react';
import { IconButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import { handleRovingKeyDown, initRovingTabIndex } from '../utils/rovingFocus';
import { getTheme, mergeStyleSets } from '@fluentui/react/lib/Styling';
import { IImageArea } from '../models/IImageMap';
import { strings } from '../loc/strings';

const theme = getTheme();
const css = mergeStyleSets({
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
});

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
  const a = props.area;
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
      aria-label={strings.actionsFor(props.index + 1)}
      data-ui="quick-actions"
      onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); e.stopPropagation(); props.onEscape(); return; }
        handleRovingKeyDown(e, 'horizontal');
      }}
    >
      <span className={css.target} title={a.url || strings.noLink} aria-label={a.url ? strings.targetAria(a.url) : strings.noLinkSet} role="note">
        <Icon iconName="Link" aria-hidden={true} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.url || strings.noLink}</span>
      </span>
      <IconButton iconProps={{ iconName: 'Edit' }} title={strings.propertiesShortcut} ariaLabel={strings.editNumberedAria(props.index + 1)} onClick={props.onEdit} />
      <IconButton iconProps={{ iconName: 'Copy' }} title={strings.duplicateShortcut} ariaLabel={strings.duplicateAria(props.index + 1)} onClick={props.onDuplicate} />
      <IconButton iconProps={{ iconName: 'Delete' }} title={strings.deleteShortcut} ariaLabel={strings.deleteAreaAria(props.index + 1)} onClick={props.onDelete} />
    </div>
  );
};
