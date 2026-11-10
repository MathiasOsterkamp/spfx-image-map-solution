import { getTheme, hiddenContentStyle, HighContrastSelector, mergeStyleSets } from '@fluentui/react/lib/Styling';

const theme = getTheme();

export const classNames = mergeStyleSets({
  /** Visible to screen readers only */
  srOnly: hiddenContentStyle,

  // ---------- Display mode: links over the image ----------
  areaList: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    margin: 0,
    padding: 0,
    listStyle: 'none',
    pointerEvents: 'none'
  },
  areaItem: {
    position: 'absolute',
    boxSizing: 'border-box',
    margin: 0,
    padding: 0,
    // Minimum target size 24 × 24 px (WCAG 2.5.8)
    minWidth: 24,
    minHeight: 24,
    pointerEvents: 'auto'
  },
  textLinks: { margin: '12px 0 0', paddingLeft: 20, lineHeight: 1.6, fontSize: 14 },
  textLink: {
    color: theme.palette.themePrimary,
    textDecoration: 'underline',
    selectors: {
      ':hover': { color: theme.palette.themeDarker },
      ':focus': { outline: `2px solid ${theme.palette.neutralPrimary}`, outlineOffset: 2 }
    }
  },
  newTabIcon: { fontSize: 12, marginLeft: 4, verticalAlign: 'middle' },
  // ---------- shared image surface (display + editor) ----------
  outer: { width: '100%', textAlign: 'center' },
  outerStretch: { textAlign: 'left' },
  frame: {
    position: 'relative',
    display: 'inline-block',
    maxWidth: '100%',
    verticalAlign: 'top',
    lineHeight: 0,
    textAlign: 'left'
  },
  frameStretch: { display: 'block', width: '100%' },
  image: {
    display: 'block',
    maxWidth: '100%',
    height: 'auto',
    userSelect: 'none',
    msUserSelect: 'none'
  },
  imageStretch: { width: '100%' },

  // ---------- Editor ----------
  editor: { border: `1px solid ${theme.palette.neutralLight}`, padding: 8, background: theme.palette.white },
  hint: { color: theme.palette.neutralSecondary, margin: '4px 0 8px' },
  surface: {
    cursor: 'crosshair',
    touchAction: 'none',
    msTouchAction: 'none',
    outline: 'none',
    selectors: {
      ':focus': { boxShadow: `0 0 0 2px ${theme.palette.themeLight}` }
    }
  },
  editArea: {
    position: 'absolute',
    boxSizing: 'border-box',
    cursor: 'move',
    // Guide line so that areas without border/fill are visible too
    boxShadow: '0 0 0 1px rgba(255,255,255,.8), inset 0 0 0 1px rgba(0,0,0,.35)'
  },
  editAreaSelected: {
    outline: `2px solid ${theme.palette.themePrimary}`,
    outlineOffset: '1px',
    zIndex: 2
  },
  editAreaMissingLink: {
    boxShadow: `0 0 0 1px rgba(255,255,255,.8), inset 0 0 0 2px ${theme.palette.red}`
  },
  badge: {
    position: 'absolute',
    left: 2,
    top: 2,
    minWidth: 18,
    height: 18,
    lineHeight: '18px',
    padding: '0 4px',
    borderRadius: 9,
    fontSize: 11,
    fontWeight: 600,
    textAlign: 'center',
    color: theme.palette.white,
    background: theme.palette.themePrimary,
    pointerEvents: 'none'
  },
  handle: {
    position: 'absolute',
    width: 12,
    height: 12,
    marginLeft: -6,
    marginTop: -6,
    boxSizing: 'border-box',
    background: theme.palette.white,
    border: `2px solid ${theme.palette.themePrimary}`,
    borderRadius: 2,
    zIndex: 3
  },
  draft: {
    position: 'absolute',
    boxSizing: 'border-box',
    border: `2px dashed ${theme.palette.themePrimary}`,
    background: 'rgba(0, 120, 212, .12)',
    pointerEvents: 'none'
  },
  listHeading: { margin: '16px 0 4px', fontSize: 14, fontWeight: 600 },
  list: { margin: 0, padding: 0, listStyle: 'none' },
  listRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 4px',
    borderBottom: `1px solid ${theme.palette.neutralLighter}`
  },
  listRowSelected: {
    background: theme.palette.themeLighterAlt,
    selectors: { [HighContrastSelector]: { outline: '2px solid Highlight' } }
  },
  listSelect: {
    flex: 1,
    minWidth: 0,
    minHeight: 32,
    display: 'flex',
    alignItems: 'center',
    border: 'none',
    background: 'transparent',
    padding: '4px 0',
    textAlign: 'left',
    font: 'inherit',
    color: 'inherit',
    cursor: 'pointer',
    selectors: { ':focus': { outline: `2px solid ${theme.palette.neutralPrimary}`, outlineOffset: -2 } }
  },
  listIndex: { width: 28, flexShrink: 0, fontWeight: 600, color: theme.palette.themePrimary },
  listText: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  issueIcon: { color: theme.palette.redDark, marginRight: 6 },
  issueBadge: {
    position: 'absolute',
    right: -8,
    top: -8,
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: theme.palette.redDark,
    color: theme.palette.white,
    fontSize: 12,
    fontWeight: 700,
    lineHeight: '18px',
    textAlign: 'center',
    pointerEvents: 'none',
    zIndex: 4,
    selectors: { [HighContrastSelector]: { background: 'Mark', color: 'MarkText', forcedColorAdjust: 'none' } }
  },
  canvasRow: { display: 'flex', alignItems: 'flex-start', minHeight: 0 },
  canvasCol: { flex: 1, minWidth: 0, padding: 8 },
  sideCol: {
    width: 360,
    flexShrink: 0,
    alignSelf: 'stretch',
    overflowY: 'auto',
    borderLeft: `1px solid ${theme.palette.neutralLight}`
  },
  fullscreenNote: { padding: 16, textAlign: 'center', color: theme.palette.neutralSecondary },
  issueList: { margin: '4px 0 0', paddingLeft: 18 },
  placeholder: {
    padding: '32px 16px',
    textAlign: 'center',
    border: `2px dashed ${theme.palette.neutralTertiaryAlt}`,
    background: theme.palette.neutralLighterAlt
  },
  placeholderIcon: { fontSize: 40, color: theme.palette.neutralSecondary },

  // ---------- Panels ----------
  swatchButton: { minWidth: 0, padding: '0 8px' },
  swatchOuter: {
    display: 'inline-block',
    width: 20,
    height: 20,
    marginRight: 8,
    verticalAlign: 'middle',
    border: `1px solid ${theme.palette.neutralTertiary}`,
    // Checkerboard so transparency becomes visible
    backgroundColor: '#fff',
    backgroundImage: 'linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%),linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%)',
    backgroundSize: '8px 8px',
    backgroundPosition: '0 0, 4px 4px'
  },
  swatchInner: { display: 'block', width: '100%', height: '100%' },
  previewStage: {
    position: 'relative',
    height: 90,
    marginTop: 8,
    backgroundColor: theme.palette.neutralLight,
    backgroundImage: `repeating-linear-gradient(45deg, ${theme.palette.neutralLighter} 0, ${theme.palette.neutralLighter} 10px, transparent 10px, transparent 20px)`
  },
  previewBox: { position: 'absolute', left: '20%', top: 15, width: '60%', height: 60, boxSizing: 'border-box' },
  grid: { display: 'flex', flexWrap: 'wrap', margin: '8px -4px 0' },
  tile: {
    width: 'calc(50% - 8px)',
    margin: 4,
    padding: 4,
    border: `2px solid ${theme.palette.neutralLight}`,
    background: theme.palette.white,
    cursor: 'pointer',
    textAlign: 'left',
    selectors: { ':hover, :focus': { borderColor: theme.palette.themePrimary } }
  },
  tileSelected: { borderColor: theme.palette.themePrimary },
  tileImage: {
    height: 90,
    backgroundColor: theme.palette.neutralLighter,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  },
  tileName: {
    display: 'block',
    marginTop: 4,
    fontSize: 12,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  dropZone: {
    marginTop: 12,
    padding: '32px 16px',
    textAlign: 'center',
    border: `2px dashed ${theme.palette.neutralTertiaryAlt}`
  },
  dropZoneActive: { borderColor: theme.palette.themePrimary, background: theme.palette.themeLighterAlt }
});
