import * as React from 'react';
import { ISecurityPolicy } from '../config/securityConfig';
import { IHoverStyle, IImageArea } from '../models/IImageMap';
import { ImageService } from '../services/ImageService';
import { PageService } from '../services/PageService';
import { ImageMapEditor } from './ImageMapEditor';
import { ImageMapViewer } from './ImageMapViewer';

export interface IImageMapProps {
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
  const { isEditMode, imageUrl, imageAlt, areas, stretch, hintAreas, showLinkList, policy } = props;
  if (isEditMode) {
    return <ImageMapEditor {...props} />;
  }
  return (
    <ImageMapViewer
      imageUrl={imageUrl}
      imageAlt={imageAlt}
      areas={areas}
      stretch={stretch}
      hintAreas={hintAreas}
      showLinkList={showLinkList}
      policy={policy}
    />
  );
};
