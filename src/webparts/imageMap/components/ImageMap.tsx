import * as React from 'react';
import { ISecurityPolicy } from '../config/securityConfig';
import { IHoverStyle, IImageArea } from '../models/IImageMap';
import { ImageService } from '../services/ImageService';
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
  policy: ISecurityPolicy;
  onAreasChange: (areas: IImageArea[]) => void;
  onImageChange: (url: string) => void;
  onImageAltChange: (alt: string) => void;
  onDefaultHoverChange: (hover: IHoverStyle) => void;
}

export const ImageMap: React.FunctionComponent<IImageMapProps> = (props: IImageMapProps) => {
  if (props.isEditMode) {
    return <ImageMapEditor {...props} />;
  }
  return (
    <ImageMapViewer
      imageUrl={props.imageUrl}
      imageAlt={props.imageAlt}
      areas={props.areas}
      stretch={props.stretch}
      hintAreas={props.hintAreas}
      showLinkList={props.showLinkList}
      policy={props.policy}
    />
  );
};
