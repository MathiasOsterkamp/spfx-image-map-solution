import * as React from 'react';
import * as ReactDom from 'react-dom';
import { DisplayMode } from '@microsoft/sp-core-library';
import {
  BaseClientSideWebPart,
  IPropertyPaneConfiguration,
  IPropertyPaneDropdownOption,
  PropertyPaneDropdown,
  PropertyPaneLabel,
  PropertyPaneTextField,
  PropertyPaneToggle
} from '@microsoft/sp-webpart-base';
import { initializeIcons } from '@fluentui/react/lib/Icons';
import { setIconOptions } from '@fluentui/react/lib/Styling';
import { ITheme } from '@fluentui/react/lib/Theme';

import { ImageMap, IImageMapProps } from './components/ImageMap';
import { createSecurityPolicy, ISecurityPolicy } from './config/securityConfig';
import { strings } from './loc/strings';
import { IHoverStyle, IImageArea } from './models/IImageMap';
import { ImageService } from './services/ImageService';
import { PageService } from './services/PageService';
import { configureLogging, LOG_LEVEL_NAMES, logInfo, LogLevelName, sanitizeLogLevel } from './utils/logging';
import { sanitizeAreas, sanitizeHover } from './utils/sanitize';
import { createSharePointTheme } from './utils/theme';
import { asRecord } from './utils/untyped';
import { checkAlt, checkImageUrl, validateFolderPath } from './utils/validation';

export interface IImageMapWebPartProps {
  imageUrl: string;
  imageAlt: string;
  areas: IImageArea[];
  stretch: boolean;
  hintAreas: boolean;
  showLinkList: boolean;
  uploadFolder: string;
  defaultHover: IHoverStyle;
  /** From which level on the log is written to the browser console */
  logLevel: LogLevelName;
}

/** Name and version of the solution package, shown on the developer page of the property pane. */
const SOLUTION = asRecord(asRecord(require('../../../config/package-solution.json')).solution);
const SOLUTION_NAME = String(SOLUTION.name || '');
const SOLUTION_VERSION = String(SOLUTION.version || '');

let iconsInitialized = false;

export default class ImageMapWebPart extends BaseClientSideWebPart<IImageMapWebPartProps> {
  private service!: ImageService;
  private pageService!: PageService;
  private policy!: ISecurityPolicy;
  private theme!: ITheme;

  // Note: No override of `dataVersion` – the SPFx 1.4.1 typings declare it as a property,
  // newer TypeScript versions reject a getter override (TS2611). Default is 1.0.

  protected onInit(): Promise<void> {
    if (!iconsInitialized) {
      // SharePoint sometimes already registers icons with the same name → suppress warnings.
      setIconOptions({ disableWarnings: true });
      // On-premises without internet: host the font files yourself and call initializeIcons('https://…/fonts/').
      initializeIcons();
      iconsInitialized = true;
    }
    configureLogging(sanitizeLogLevel(this.properties.logLevel));
    logInfo('Web part initialized', { solution: SOLUTION_NAME, version: SOLUTION_VERSION, instanceId: this.context.instanceId });
    this.theme = createSharePointTheme();
    this.policy = createSecurityPolicy(this.context.pageContext.web.absoluteUrl);
    this.service = new ImageService(
      this.context.spHttpClient,
      this.context.pageContext.web.absoluteUrl,
      this.context.pageContext.web.serverRelativeUrl
    );
    this.pageService = new PageService(this.context.spHttpClient, this.context.pageContext.web.absoluteUrl);
    return super.onInit();
  }

  public render(): void {
    const p = this.properties;
    const folder = validateFolderPath(p.uploadFolder) ? 'SiteAssets' : p.uploadFolder;
    // The property pane is reactive: a changed log level applies immediately.
    configureLogging(sanitizeLogLevel(p.logLevel));

    const props: IImageMapProps = {
      theme: this.theme,
      isEditMode: this.displayMode === DisplayMode.Edit,
      // All stored values are considered untrusted and are sanitized.
      imageUrl: typeof p.imageUrl === 'string' ? p.imageUrl.substr(0, this.policy.maxUrlLength) : '',
      imageAlt: typeof p.imageAlt === 'string' ? p.imageAlt.substr(0, this.policy.maxAltLength) : '',
      areas: sanitizeAreas(p.areas, this.policy),
      stretch: p.stretch === true,
      hintAreas: p.hintAreas === true,
      showLinkList: p.showLinkList === true,
      defaultHover: sanitizeHover(p.defaultHover),
      uploadFolder: folder,
      service: this.service,
      pageService: this.pageService,
      policy: this.policy,
      onAreasChange: (areas: IImageArea[]) => {
        this.properties.areas = areas;
        this.render();
      },
      onImageChange: (url: string) => {
        this.properties.imageUrl = url;
        this.render();
      },
      onImageAltChange: (alt: string) => {
        this.properties.imageAlt = alt;
        this.render();
      },
      onDefaultHoverChange: (hover: IHoverStyle) => {
        this.properties.defaultHover = hover;
        this.render();
      }
    };

    ReactDom.render(React.createElement(ImageMap, props), this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  private validateImageUrl(value: string): string {
    return value ? (checkImageUrl(value, this.policy).error || '') : '';
  }

  private validateAlt(value: string): string {
    return this.properties.imageUrl ? (checkAlt(value, this.policy.maxAltLength) || '') : '';
  }

  private validateFolder(value: string): string | Promise<string> {
    const error = validateFolderPath(value);
    if (error) {
      return error;
    }
    return this.service.folderExists(value).then((exists: boolean) =>
      exists ? '' : strings.folderNotFound
    );
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: { description: strings.propertyPaneDescription },
          groups: [
            {
              groupName: strings.groupImage,
              groupFields: [
                PropertyPaneTextField('imageUrl', {
                  label: strings.imageUrlLabel,
                  description: strings.imageUrlDescription,
                  onGetErrorMessage: this.validateImageUrl.bind(this)
                }),
                PropertyPaneTextField('imageAlt', {
                  label: strings.altRequiredLabel,
                  description: strings.altDescription,
                  multiline: true,
                  onGetErrorMessage: this.validateAlt.bind(this)
                }),
                PropertyPaneToggle('stretch', {
                  label: strings.stretchLabel,
                  onText: strings.yes,
                  offText: strings.stretchOff
                })
              ]
            },
            {
              groupName: strings.groupDisplay,
              groupFields: [
                PropertyPaneToggle('hintAreas', {
                  label: strings.hintAreasLabel,
                  onText: strings.hintAreasOn,
                  offText: strings.hintAreasOff
                }),
                PropertyPaneToggle('showLinkList', {
                  label: strings.linkListLabel,
                  onText: strings.linkListOn,
                  offText: strings.linkListOff
                })
              ]
            },
            {
              groupName: strings.groupUpload,
              groupFields: [
                PropertyPaneTextField('uploadFolder', {
                  label: strings.uploadFolderLabel,
                  description: strings.uploadFolderDescription,
                  onGetErrorMessage: this.validateFolder.bind(this),
                  deferredValidationTime: 600
                })
              ]
            }
          ]
        },
        {
          header: { description: strings.developerPageTitle },
          groups: [
            {
              groupName: strings.groupDiagnostics,
              groupFields: [
                PropertyPaneLabel('', {
                  text: strings.solutionInfo(SOLUTION_NAME, SOLUTION_VERSION)
                }),
                PropertyPaneDropdown('logLevel', {
                  label: strings.logLevelLabel,
                  options: LOG_LEVEL_NAMES.map((level: LogLevelName): IPropertyPaneDropdownOption => ({
                    key: level,
                    text: strings.logLevels[level]
                  })),
                  selectedKey: sanitizeLogLevel(this.properties.logLevel)
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
