import * as React from 'react';
import * as ReactDom from 'react-dom';
import { DisplayMode } from '@microsoft/sp-core-library';
import {
  BaseClientSideWebPart,
  IPropertyPaneConfiguration,
  PropertyPaneTextField,
  PropertyPaneToggle
} from '@microsoft/sp-webpart-base';
import { initializeIcons } from '@fluentui/react/lib/Icons';
import { setIconOptions } from '@fluentui/react/lib/Styling';

import { ImageMap, IImageMapProps } from './components/ImageMap';
import { createSecurityPolicy, ISecurityPolicy } from './config/securityConfig';
import { IHoverStyle, IImageArea } from './models/IImageMap';
import { ImageService } from './services/ImageService';
import { sanitizeAreas, sanitizeHover } from './utils/sanitize';
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
}

let iconsInitialized = false;

export default class ImageMapWebPart extends BaseClientSideWebPart<IImageMapWebPartProps> {
  private service!: ImageService;
  private policy!: ISecurityPolicy;

  // Hinweis: Kein Override von `dataVersion` – die SPFx-1.4.1-Typings deklarieren es als Property,
  // neuere TypeScript-Versionen lehnen einen Getter-Override ab (TS2611). Standard ist 1.0.

  protected onInit(): Promise<void> {
    if (!iconsInitialized) {
      // SharePoint registriert teilweise schon gleichnamige Icons → Warnungen unterdrücken.
      setIconOptions({ disableWarnings: true });
      // On-Premises ohne Internet: Schriftdateien selbst hosten und initializeIcons('https://…/fonts/') aufrufen.
      initializeIcons();
      iconsInitialized = true;
    }
    this.policy = createSecurityPolicy(this.context.pageContext.web.absoluteUrl);
    this.service = new ImageService(
      this.context.spHttpClient,
      this.context.pageContext.web.absoluteUrl,
      this.context.pageContext.web.serverRelativeUrl
    );
    return super.onInit();
  }

  public render(): void {
    const p = this.properties;
    const folder = validateFolderPath(p.uploadFolder) ? 'SiteAssets' : p.uploadFolder;

    const props: IImageMapProps = {
      isEditMode: this.displayMode === DisplayMode.Edit,
      // Alle gespeicherten Werte gelten als nicht vertrauenswürdig und werden bereinigt.
      imageUrl: typeof p.imageUrl === 'string' ? p.imageUrl.substr(0, this.policy.maxUrlLength) : '',
      imageAlt: typeof p.imageAlt === 'string' ? p.imageAlt.substr(0, this.policy.maxAltLength) : '',
      areas: sanitizeAreas(p.areas, this.policy),
      stretch: p.stretch === true,
      hintAreas: p.hintAreas === true,
      showLinkList: p.showLinkList === true,
      defaultHover: sanitizeHover(p.defaultHover),
      uploadFolder: folder,
      service: this.service,
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
      exists ? '' : 'Dieser Ordner existiert nicht oder Sie haben keinen Zugriff.'
    );
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: { description: 'Bild mit verlinkten Bereichen. Bereiche, Links und Alternativtext werden direkt im Webpart bearbeitet.' },
          groups: [
            {
              groupName: 'Bild',
              groupFields: [
                PropertyPaneTextField('imageUrl', {
                  label: 'Bild-URL',
                  description: 'Wird auch über „Bild auswählen“ im Webpart gesetzt.',
                  onGetErrorMessage: this.validateImageUrl.bind(this)
                }),
                PropertyPaneTextField('imageAlt', {
                  label: 'Alternativtext (Pflicht)',
                  description: 'Beschreibung des Bildes für Screenreader.',
                  multiline: true,
                  onGetErrorMessage: this.validateAlt.bind(this)
                }),
                PropertyPaneToggle('stretch', {
                  label: 'Bild auf volle Breite strecken',
                  onText: 'Ja',
                  offText: 'Nein (max. Originalgröße)'
                })
              ]
            },
            {
              groupName: 'Darstellung und Barrierefreiheit',
              groupFields: [
                PropertyPaneToggle('hintAreas', {
                  label: 'Bereiche dauerhaft andeuten',
                  onText: 'Ja (empfohlen für Touch-Geräte)',
                  offText: 'Nein, nur beim Überfahren und Fokus'
                }),
                PropertyPaneToggle('showLinkList', {
                  label: 'Links zusätzlich als Liste unter dem Bild anzeigen',
                  onText: 'Ja (empfohlen für Barrierefreiheit)',
                  offText: 'Nein (nur bei Ladefehler)'
                })
              ]
            },
            {
              groupName: 'Upload',
              groupFields: [
                PropertyPaneTextField('uploadFolder', {
                  label: 'Bibliotheksordner',
                  description: 'Relativ zur aktuellen Website, z. B. „SiteAssets“ oder „SiteAssets/Bilder“. Der Ordner muss existieren.',
                  onGetErrorMessage: this.validateFolder.bind(this),
                  deferredValidationTime: 600
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
