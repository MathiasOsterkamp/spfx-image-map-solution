import * as resources from 'ImageMapWebPartStrings';
import { formatTemplate } from './template';

/**
 * Texts with parameters. In the language files they are templates (see template.ts), because the
 * SPFx build writes the language files as plain data and would drop functions. Here they become
 * the functions declared in IImageMapWebPartStrings.
 */
const TEMPLATES: (keyof IImageMapWebPartStrings)[] = [
  'quote', 'area', 'areaCount', 'charCounter', 'rectPosition', 'rectSize', 'circleDiameter', 'announceTool',
  'maxAreasReached', 'labelShapeAdded', 'announceShapeAdded', 'announceDuplicated', 'labelDeleted',
  'announceDeleted', 'announceReordered', 'announceMoved', 'announceResized', 'announceDiameter', 'announceSize',
  'canvasLabel', 'areaAriaLabel', 'problemCount', 'listHeading', 'moveForwardAria', 'moveBackwardAria',
  'editAreaAria', 'deleteAreaNamedAria', 'imageNotAllowed', 'previewClick', 'increaseBy', 'decreaseBy',
  'announceTargetSet', 'fixTo', 'titleDescription', 'tooltipDescription', 'labelPresetChosen', 'deleteAreaAria',
  'editAreaTitle', 'propertiesOf', 'selectTitle', 'drawTitle', 'undoWith', 'redoWith', 'undoTitle', 'redoTitle',
  'insertCentered', 'issuesLabel', 'pagesFound', 'actionsFor', 'targetAria', 'editNumberedAria', 'duplicateAria',
  'openColorPicker', 'interactiveGraphic', 'linkFallback', 'imagesFound', 'imagesLoadFailed', 'uploadedAndSelected',
  'uploadFailed', 'folderInfo', 'openFolderAria', 'noImagesFound', 'selectImageAria', 'uploadRules', 'uploadTarget',
  'undone', 'redone', 'httpError', 'fileTooLarge', 'invalidImageContent', 'linkTooLong', 'linkMustBeEncoded',
  'pathTooLong', 'protocolNotAllowed', 'domainTooLong', 'domainNotAllowed', 'textTooLong', 'textForbiddenChars',
  'issueArea', 'issueTitle', 'issueTooltip'
];

function createStrings(): IImageMapWebPartStrings {
  const source = resources as { [key: string]: unknown };
  const zeroIsSingular = !!source.zeroIsSingular;
  const result: { [key: string]: unknown } = {};
  Object.keys(source).forEach((key: string) => { result[key] = source[key]; });
  TEMPLATES.forEach((key: string) => {
    const template = typeof source[key] === 'string' ? source[key] as string : '';
    result[key] = (...args: unknown[]): string => formatTemplate(template, args, zeroIsSingular);
  });
  return result as unknown as IImageMapWebPartStrings;
}

/** All user-facing texts of the web part in the language of the page. */
export const strings: IImageMapWebPartStrings = createStrings();
