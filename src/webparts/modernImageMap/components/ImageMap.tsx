import * as React from 'react';
import { ITheme, ThemeProvider } from '@fluentui/react/lib/Theme';
import { ImageMapEditor } from './ImageMapEditor';
import { ImageMapViewer } from './ImageMapViewer';
import { ISecurityPolicy } from '../config/securityConfig';
import { IHoverStyle, IImageArea } from '../models/IImageMap';
import { ImageService } from '../services/ImageService';
import { PageService } from '../services/PageService';

export interface IImageMapProps {
  /** Theme of the SharePoint site, calculated by the web part (see utils/theme.ts) */
  theme: ITheme;
  isEditMode: boolean;
  imageUrl: string;
  imageAlt: string;
  areas: IImageArea[];
  stretch: boolean;
  hintAreas: boolean;
  showLinkList: boolean;
  defaultHover: IHoverStyle;
  uploadFolder: string;
  service: ImageService;
  pageService: PageService;
  policy: ISecurityPolicy;
  onAreasChange: (areas: IImageArea[]) => void;
  onImageChange: (url: string) => void;
  onImageAltChange: (alt: string) => void;
  onDefaultHoverChange: (hover: IHoverStyle) => void;
}

export const ImageMap: React.FunctionComponent<IImageMapProps> = (props: IImageMapProps) => {
  const { theme, isEditMode, ...content } = props;
  const { imageUrl, imageAlt, areas, stretch, hintAreas, showLinkList, policy } = content;
  // applyTo="none": only provides the theme, without painting a background of its own over the page section.
  return (
    <ThemeProvider theme={theme} applyTo="none">
      {isEditMode ? (
        <ImageMapEditor {...content} />
      ) : (
        <ImageMapViewer
          imageUrl={imageUrl}
          imageAlt={imageAlt}
          areas={areas}
          stretch={stretch}
          hintAreas={hintAreas}
          showLinkList={showLinkList}
          policy={policy}
        />
      )}
    </ThemeProvider>
  );
};
