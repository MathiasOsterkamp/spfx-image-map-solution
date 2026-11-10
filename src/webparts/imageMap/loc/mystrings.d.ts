declare type ImageMapStringsShapeMap = { [K in import('../models/IImageMap').AreaShape]: string };
declare type ImageMapStringsToolMap = { [K in import('../models/IImageMap').AreaShape | 'select']: string };

/**
 * All user-facing texts of the web part. Texts with parameters are functions so that
 * every language can handle word order and plural forms itself.
 */
declare interface IImageMapWebPartStrings {
  // ---------- General ----------
  /** Decimal separator for displayed numbers */
  decimalSeparator: string;
  /** Quotes a single character or word, e.g. „x“ / "x" / « x » */
  quote: (text: string) => string;
  yes: string;
  no: string;
  save: string;
  cancel: string;
  apply: string;
  edit: string;
  delete: string;
  untitled: string;
  area: (n: number) => string;
  areaCount: (n: number) => string;
  charCounter: (length: number, max: number) => string;
  shapeNames: ImageMapStringsShapeMap;
  toolNames: ImageMapStringsToolMap;
  /** Single-key shortcuts of the tools (letters, upper case) */
  toolKeys: ImageMapStringsToolMap;
  imageLoadFailed: string;

  // ---------- Property pane ----------
  folderNotFound: string;
  propertyPaneDescription: string;
  groupImage: string;
  imageUrlLabel: string;
  imageUrlDescription: string;
  altRequiredLabel: string;
  altDescription: string;
  stretchLabel: string;
  stretchOff: string;
  groupDisplay: string;
  hintAreasLabel: string;
  hintAreasOn: string;
  hintAreasOff: string;
  linkListLabel: string;
  linkListOn: string;
  linkListOff: string;
  groupUpload: string;
  uploadFolderLabel: string;
  uploadFolderDescription: string;

  // ---------- Editor ----------
  rectPosition: (x: string, y: string) => string;
  rectSize: (width: string, height: string) => string;
  circleDiameter: (diameter: string) => string;
  announceToolSelect: string;
  announceTool: (toolName: string) => string;
  maxAreasReached: (max: number) => string;
  labelShapeAdded: (shapeName: string, drawn: boolean) => string;
  announceShapeAdded: (shapeName: string, n: number, drawn: boolean) => string;
  labelDuplicated: string;
  announceDuplicated: (n: number) => string;
  labelDeleted: (n: number) => string;
  announceDeleted: (n: number, remaining: number) => string;
  labelReordered: string;
  announceReordered: (position: number, total: number) => string;
  announceFullscreenOn: string;
  announceFullscreenOff: string;
  labelMoved: string;
  labelResized: string;
  announceMoved: (description: string) => string;
  announceResized: (description: string) => string;
  announceDiameter: (diameter: string) => string;
  announceSize: (width: string, height: string) => string;
  announceChooseShapeFirst: string;
  announceImageApplied: string;
  announceAltSaved: string;
  placeholderTitle: string;
  placeholderText: string;
  chooseImage: string;
  labelStyleAppliedToAll: string;
  announceStyleAppliedToAll: string;
  announceSavedAsDefault: string;
  editorHelp: string;
  canvasRoleDescription: string;
  canvasLabel: (toolName: string, areaCount: number) => string;
  areaAriaLabel: (n: number, shapeName: string, title: string, description: string) => string;
  problemCount: (n: number) => string;
  listHeading: (n: number) => string;
  noAreas: string;
  noLinkLower: string;
  newTabShort: string;
  errorsPrefix: string;
  moveForwardTitle: string;
  moveForwardAria: (n: number) => string;
  moveBackwardTitle: string;
  moveBackwardAria: (n: number) => string;
  editAreaAria: (n: number, name: string) => string;
  deleteAreaNamedAria: (n: number, name: string) => string;
  labelSorted: string;
  announceSorted: string;
  announcePreviewOn: string;
  announceEditing: string;
  imageNotAllowed: (error: string) => string;
  previewInfo: string;
  previewClick: (title: string, url: string, newTab: boolean) => string;
  fullscreenNote: string;
  fullscreenTitle: string;

  // ---------- Area properties ----------
  shapeOptions: ImageMapStringsShapeMap;
  borderStyles: { [K in import('../models/IImageMap').AreaBorderStyle]: string };
  linkKinds: { internal: string; external: string; mailto: string; tel: string; anchor: string };
  presets: { [K in import('../models/IImageMap').HoverPresetKey]: { name: string; description: string } };
  labelPositionChanged: string;
  labelShapeChanged: string;
  increaseBy: (label: string, step: string) => string;
  decreaseBy: (label: string, step: string) => string;
  labelPageSelected: string;
  announceTargetSet: (title: string) => string;
  customStyle: string;
  customStyleAria: string;
  propertiesAria: string;
  tabLink: string;
  tabStyle: string;
  tabPosition: string;
  tabHasErrors: string;
  tabPoorlyVisible: string;
  targetUrlLabel: string;
  linkPlaceholder: string;
  labelTargetChanged: string;
  searchPageTitle: string;
  searchPageAria: string;
  fixTo: (suggestion: string) => string;
  labelTargetFixed: string;
  titleLabel: string;
  labelTitleChanged: string;
  titleDescription: (counter: string) => string;
  tooltipLabel: string;
  labelTooltipChanged: string;
  tooltipDescription: (counter: string) => string;
  newTabLabel: string;
  labelNewTabOn: string;
  labelNewTabOff: string;
  shapeLabel: string;
  presetLabel: string;
  announceCustomStyle: string;
  labelPresetChosen: (name: string) => string;
  borderColorLabel: string;
  labelBorderColor: string;
  borderWidthLabel: string;
  labelBorderWidth: string;
  borderStyleLabel: string;
  labelBorderStyle: string;
  fillColorLabel: string;
  labelFillColor: string;
  cornerRadiusLabel: string;
  labelCornerRadius: string;
  preview: string;
  focusRingNote: string;
  applyToAll: string;
  saveAsDefault: string;
  positionHint: string;
  leftLabel: string;
  topLabel: string;
  diameterLabel: string;
  widthLabel: string;
  heightLabel: string;
  done: string;
  deleteArea: string;
  deleteAreaAria: (n: number) => string;
  editAreaTitle: (n: number) => string;
  closeProperties: string;
  propertiesOf: (n: number) => string;

  // ---------- Toolbar ----------
  selectTitle: (key: string) => string;
  drawTitle: (toolName: string, key: string) => string;
  image: string;
  changeImageMenu: string;
  chooseImageMenu: string;
  editAltMenu: string;
  undo: string;
  redo: string;
  undoWith: (label: string) => string;
  redoWith: (label: string) => string;
  undoTitle: (label?: string) => string;
  redoTitle: (label?: string) => string;
  insertArea: string;
  insertCentered: (toolName: string) => string;
  sortOrder: string;
  sortOrderTitle: string;
  previewTitle: string;
  backToEditTitle: string;
  fullscreen: string;
  exitFullscreen: string;
  fullscreenTooltip: string;
  exitFullscreenTooltip: string;
  toolbarAria: string;
  moreCommands: string;

  // ---------- Issues ----------
  issuesLabel: (n: number) => string;
  openList: string;
  issuesFooter: string;

  // ---------- Page search ----------
  searching: string;
  noPagesFound: string;
  pagesFound: (n: number) => string;
  searchPlaceholder: string;
  searchAria: string;
  foundPages: string;

  // ---------- Quick actions ----------
  actionsFor: (n: number) => string;
  noLink: string;
  targetAria: (url: string) => string;
  noLinkSet: string;
  propertiesShortcut: string;
  editNumberedAria: (n: number) => string;
  duplicateShortcut: string;
  duplicateAria: (n: number) => string;
  deleteShortcut: string;

  // ---------- Alt text dialog ----------
  altDialogTitle: string;
  altDialogSubText: string;
  altLabel: string;

  // ---------- Color field ----------
  openColorPicker: (label: string, value: string) => string;

  // ---------- Viewer ----------
  newTabSuffix: string;
  imageBlocked: string;
  interactiveGraphic: (linkCount: number) => string;
  linkFallback: (n: number) => string;
  linksAsList: string;
  graphicLinks: string;

  // ---------- Image picker ----------
  imagesFound: (n: number) => string;
  imagesLoadFailed: (message: string) => string;
  checkingAndUploading: string;
  uploadedAndSelected: (name: string) => string;
  uploadFailed: (message: string) => string;
  closePicker: string;
  areasKept: string;
  closeMessage: string;
  imageSource: string;
  tabLibrary: string;
  folderInfo: (path: string) => string;
  refreshList: string;
  loadingImages: string;
  noImages: string;
  imagesInFolder: string;
  selectImageAria: (name: string, current: boolean) => string;
  tabUpload: string;
  uploadingSpinner: string;
  dropHere: string;
  chooseFile: string;
  uploadRules: (allowed: string, maxMb: number) => string;
  uploadTarget: (path: string) => string;
  tabAddress: string;
  imageUrlField: string;
  imageUrlPlaceholder: string;
  sameHostOnly: string;

  // ---------- History ----------
  nothingToUndo: string;
  undone: (label: string) => string;
  nothingToRedo: string;
  redone: (label: string) => string;

  // ---------- Services ----------
  httpBadRequest: string;
  httpForbidden: string;
  httpNotFound: string;
  httpConflict: string;
  httpTooLarge: string;
  httpLocked: string;
  httpBusy: string;
  httpError: (status: number) => string;
  fileReadFailed: string;
  pageSearchFailed: string;

  // ---------- File validation ----------
  noFileSelected: string;
  fileEmpty: string;
  fileTooLarge: (sizeMb: string, maxMb: string) => string;
  invalidImageContent: (allowed: string) => string;
  defaultFileName: string;

  // ---------- Hover styles ----------
  visibilityWarning: string;

  // ---------- Validation ----------
  linkTooLong: (length: number, max: number) => string;
  linkControlChars: string;
  linkInvisibleChars: string;
  linkBackslash: string;
  linkMustBeEncoded: (hasSpaces: boolean, chars?: string) => string;
  invalidPercentEncoding: string;
  pathTooLong: (length: number, max: number) => string;
  enterLink: string;
  emptyAnchor: string;
  protocolRelativeLink: string;
  linkNeedsHttps: string;
  relativeLinkSlash: string;
  invalidEmail: string;
  emailTooLong: string;
  invalidEmailDomain: string;
  invalidPhone: string;
  protocolNotAllowed: (protocol: string) => string;
  invalidWebAddress: string;
  linkUserInfo: string;
  domainTooLong: (max: number) => string;
  httpLinkNotAllowed: string;
  httpWarning: string;
  domainNotAllowed: (host: string, allowed: string) => string;
  chooseImageError: string;
  protocolRelativeUrl: string;
  imageUrlNeedsHttps: string;
  imageUrlOnlyHttps: string;
  imageUrlUserInfo: string;
  imageNeedsHttps: string;
  imageSameHostOnly: string;
  folderRequired: string;
  folderRelative: string;
  folderTooLong: string;
  folderInvalid: string;
  textTooLong: (length: number, max: number) => string;
  textControlChars: string;
  textInvisibleChars: string;
  textForbiddenChars: (chars: string) => string;
  titleRequired: string;
  titleGeneric: string;
  altMissing: string;
  issueArea: (n: number, error: string) => string;
  issueTitle: (n: number, error: string) => string;
  issueTooltip: (n: number, error: string) => string;
}

declare module 'ImageMapWebPartStrings' {
  const strings: IImageMapWebPartStrings;
  export = strings;
}
