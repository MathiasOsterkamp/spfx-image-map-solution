declare type ImageMapStringsShapeMap = { [K in import('../models/IImageMap').AreaShape]: string };
declare type ImageMapStringsToolMap = { [K in import('../models/IImageMap').AreaShape | 'select']: string };

/**
 * All user-facing texts of the web part (module "ImageMapWebPartStrings").
 * The SPFx build writes the language files as plain data, so they cannot contain functions.
 * Texts with parameters are templates and are filled in with formatText from loc/template:
 * every language can handle word order and plural forms itself.
 */
declare interface IImageMapWebPartStrings {
  /** Plural rule: '1' = 0 and 1 are singular (French), '' = only 1 is singular */
  zeroIsSingular: string;

  // ---------- General ----------
  /** Decimal separator for displayed numbers */
  decimalSeparator: string;
  /** Quotes a single character or word, e.g. „x“ / "x" / « x » */
  /** Template: {0} = text */
  quote: string;
  yes: string;
  no: string;
  save: string;
  cancel: string;
  apply: string;
  edit: string;
  delete: string;
  untitled: string;
  /** Template: {0} = n */
  area: string;
  /** Template: {0} = n */
  areaCount: string;
  /** Template: {0} = length, {1} = max */
  charCounter: string;
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
  /** Title of the second page of the property pane */
  developerPageTitle: string;
  groupDiagnostics: string;
  /** Template: {0} = name, {1} = version */
  solutionInfo: string;
  logLevelLabel: string;
  logLevels: { [K in import('../utils/logging').LogLevelName]: string };
  uploadFolderLabel: string;
  uploadFolderDescription: string;

  // ---------- Editor ----------
  /** Template: {0} = x, {1} = y */
  rectPosition: string;
  /** Template: {0} = width, {1} = height */
  rectSize: string;
  /** Template: {0} = diameter */
  circleDiameter: string;
  announceToolSelect: string;
  /** Template: {0} = toolName */
  announceTool: string;
  /** Template: {0} = max */
  maxAreasReached: string;
  /** Template: {0} = shapeName, {1} = drawn */
  labelShapeAdded: string;
  /** Template: {0} = shapeName, {1} = n, {2} = drawn */
  announceShapeAdded: string;
  labelDuplicated: string;
  /** Template: {0} = n */
  announceDuplicated: string;
  /** Template: {0} = n */
  labelDeleted: string;
  /** Template: {0} = n, {1} = remaining */
  announceDeleted: string;
  labelReordered: string;
  /** Template: {0} = position, {1} = total */
  announceReordered: string;
  announceFullscreenOn: string;
  announceFullscreenOff: string;
  labelMoved: string;
  labelResized: string;
  /** Template: {0} = description */
  announceMoved: string;
  /** Template: {0} = description */
  announceResized: string;
  /** Template: {0} = diameter */
  announceDiameter: string;
  /** Template: {0} = width, {1} = height */
  announceSize: string;
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
  /** Template: {0} = toolName, {1} = areaCount */
  canvasLabel: string;
  /** Template: {0} = n, {1} = shapeName, {2} = title, {3} = description */
  areaAriaLabel: string;
  /** Template: {0} = n */
  problemCount: string;
  /** Template: {0} = n */
  listHeading: string;
  noAreas: string;
  noLinkLower: string;
  newTabShort: string;
  errorsPrefix: string;
  moveForwardTitle: string;
  /** Template: {0} = n */
  moveForwardAria: string;
  moveBackwardTitle: string;
  /** Template: {0} = n */
  moveBackwardAria: string;
  /** Template: {0} = n, {1} = name */
  editAreaAria: string;
  /** Template: {0} = n, {1} = name */
  deleteAreaNamedAria: string;
  labelSorted: string;
  announceSorted: string;
  announcePreviewOn: string;
  announceEditing: string;
  /** Template: {0} = error */
  imageNotAllowed: string;
  previewInfo: string;
  /** Template: {0} = title, {1} = url, {2} = newTab */
  previewClick: string;
  fullscreenNote: string;
  fullscreenTitle: string;

  // ---------- Area properties ----------
  shapeOptions: ImageMapStringsShapeMap;
  borderStyles: { [K in import('../models/IImageMap').AreaBorderStyle]: string };
  linkKinds: { internal: string; external: string; mailto: string; tel: string; anchor: string };
  presets: { [K in import('../models/IImageMap').HoverPresetKey]: { name: string; description: string } };
  labelPositionChanged: string;
  labelShapeChanged: string;
  /** Template: {0} = label, {1} = step */
  increaseBy: string;
  /** Template: {0} = label, {1} = step */
  decreaseBy: string;
  labelPageSelected: string;
  /** Template: {0} = title */
  announceTargetSet: string;
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
  /** Template: {0} = suggestion */
  fixTo: string;
  labelTargetFixed: string;
  titleLabel: string;
  labelTitleChanged: string;
  /** Template: {0} = counter */
  titleDescription: string;
  tooltipLabel: string;
  labelTooltipChanged: string;
  /** Template: {0} = counter */
  tooltipDescription: string;
  newTabLabel: string;
  labelNewTabOn: string;
  labelNewTabOff: string;
  shapeLabel: string;
  presetLabel: string;
  announceCustomStyle: string;
  /** Template: {0} = name */
  labelPresetChosen: string;
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
  /** Template: {0} = n */
  deleteAreaAria: string;
  /** Template: {0} = n */
  editAreaTitle: string;
  closeProperties: string;
  /** Template: {0} = n */
  propertiesOf: string;

  // ---------- Toolbar ----------
  /** Template: {0} = key */
  selectTitle: string;
  /** Template: {0} = toolName, {1} = key */
  drawTitle: string;
  image: string;
  changeImageMenu: string;
  chooseImageMenu: string;
  editAltMenu: string;
  undo: string;
  redo: string;
  /** Template: {0} = label */
  undoWith: string;
  /** Template: {0} = label */
  redoWith: string;
  /** Template: {0} = label */
  undoTitle: string;
  /** Template: {0} = label */
  redoTitle: string;
  insertArea: string;
  /** Template: {0} = toolName */
  insertCentered: string;
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
  /** Template: {0} = n */
  issuesLabel: string;
  openList: string;
  issuesFooter: string;

  // ---------- Page search ----------
  searching: string;
  noPagesFound: string;
  /** Template: {0} = n */
  pagesFound: string;
  searchPlaceholder: string;
  searchAria: string;
  foundPages: string;

  // ---------- Quick actions ----------
  /** Template: {0} = n */
  actionsFor: string;
  noLink: string;
  /** Template: {0} = url */
  targetAria: string;
  noLinkSet: string;
  propertiesShortcut: string;
  /** Template: {0} = n */
  editNumberedAria: string;
  duplicateShortcut: string;
  /** Template: {0} = n */
  duplicateAria: string;
  deleteShortcut: string;

  // ---------- Alt text dialog ----------
  altDialogTitle: string;
  altDialogSubText: string;
  altLabel: string;

  // ---------- Color field ----------
  /** Template: {0} = label, {1} = value */
  openColorPicker: string;

  // ---------- Viewer ----------
  newTabSuffix: string;
  imageBlocked: string;
  /** Template: {0} = linkCount */
  interactiveGraphic: string;
  /** Template: {0} = n */
  linkFallback: string;
  linksAsList: string;
  graphicLinks: string;

  // ---------- Image picker ----------
  /** Template: {0} = n */
  imagesFound: string;
  /** Template: {0} = message */
  imagesLoadFailed: string;
  checkingAndUploading: string;
  /** Template: {0} = name */
  uploadedAndSelected: string;
  /** Template: {0} = message */
  uploadFailed: string;
  closePicker: string;
  areasKept: string;
  closeMessage: string;
  imageSource: string;
  tabLibrary: string;
  /** Template: {0} = path */
  folderInfo: string;
  refreshList: string;
  loadingImages: string;
  noImages: string;
  imagesInFolder: string;
  searchImages: string;
  folderPath: string;
  /** Template: {0} = name */
  openFolderAria: string;
  loadMore: string;
  moreAvailable: string;
  /** Template: {0} = query */
  noImagesFound: string;
  listTooLarge: string;
  /** Template: {0} = name, {1} = current */
  selectImageAria: string;
  tabUpload: string;
  uploadingSpinner: string;
  dropHere: string;
  chooseFile: string;
  /** Template: {0} = allowed, {1} = maxMb */
  uploadRules: string;
  /** Template: {0} = path */
  uploadTarget: string;
  tabAddress: string;
  imageUrlField: string;
  imageUrlPlaceholder: string;
  sameHostOnly: string;

  // ---------- History ----------
  nothingToUndo: string;
  /** Template: {0} = label */
  undone: string;
  nothingToRedo: string;
  /** Template: {0} = label */
  redone: string;

  // ---------- Services ----------
  httpBadRequest: string;
  httpForbidden: string;
  httpNotFound: string;
  httpConflict: string;
  httpTooLarge: string;
  httpLocked: string;
  httpBusy: string;
  /** Template: {0} = status */
  httpError: string;
  fileReadFailed: string;
  pageSearchFailed: string;

  // ---------- File validation ----------
  noFileSelected: string;
  fileEmpty: string;
  /** Template: {0} = sizeMb, {1} = maxMb */
  fileTooLarge: string;
  /** Template: {0} = allowed */
  invalidImageContent: string;
  defaultFileName: string;

  // ---------- Hover styles ----------
  visibilityWarning: string;

  // ---------- Validation ----------
  /** Template: {0} = length, {1} = max */
  linkTooLong: string;
  linkControlChars: string;
  linkInvisibleChars: string;
  linkBackslash: string;
  /** Template: {0} = hasSpaces, {1} = chars */
  linkMustBeEncoded: string;
  invalidPercentEncoding: string;
  /** Template: {0} = length, {1} = max */
  pathTooLong: string;
  enterLink: string;
  emptyAnchor: string;
  protocolRelativeLink: string;
  linkNeedsHttps: string;
  relativeLinkSlash: string;
  invalidEmail: string;
  emailTooLong: string;
  invalidEmailDomain: string;
  invalidPhone: string;
  /** Template: {0} = protocol */
  protocolNotAllowed: string;
  invalidWebAddress: string;
  linkUserInfo: string;
  /** Template: {0} = max */
  domainTooLong: string;
  httpLinkNotAllowed: string;
  httpWarning: string;
  /** Template: {0} = host, {1} = allowed */
  domainNotAllowed: string;
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
  /** Template: {0} = length, {1} = max */
  textTooLong: string;
  textControlChars: string;
  textInvisibleChars: string;
  /** Template: {0} = chars */
  textForbiddenChars: string;
  titleRequired: string;
  titleGeneric: string;
  altMissing: string;
  /** Template: {0} = n, {1} = error */
  issueArea: string;
  /** Template: {0} = n, {1} = error */
  issueTitle: string;
  /** Template: {0} = n, {1} = error */
  issueTooltip: string;
}

declare module 'ImageMapWebPartStrings' {
  const strings: IImageMapWebPartStrings;
  export = strings;
}
