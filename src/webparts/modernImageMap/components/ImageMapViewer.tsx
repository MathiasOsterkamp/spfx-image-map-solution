import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { css } from '@fluentui/react/lib/Utilities';
import * as strings from 'ImageMapWebPartStrings';
import { useClassNames } from './styles';
import { ISecurityPolicy } from '../config/securityConfig';
import { formatText } from '../loc/template';
import { IImageArea } from '../models/IImageMap';
import { getViewAreaClass } from '../utils/hoverStyles';
import { checkImageUrl, checkLinkUrl, cleanText, IUrlCheck } from '../utils/validation';

export interface IImageMapViewerProps {
  imageUrl: string;
  imageAlt: string;
  areas: IImageArea[];
  stretch: boolean;
  hintAreas: boolean;
  showLinkList: boolean;
  policy: ISecurityPolicy;
  /** Only for test mode in the editor: intercept the click instead of navigating. */
  onPreviewClick?: (area: IImageArea) => void;
}

interface IRenderableLink {
  area: IImageArea;
  check: IUrlCheck;
  label: string;
  tooltip: string;
}

/**
 * Position within the image. Circles get their height via padding-bottom: percentage padding always refers
 * to the WIDTH of the container. This keeps the circle round at any image size.
 */
function positionStyle(area: IImageArea): React.CSSProperties {
  if (area.shape === 'circle') {
    return { left: `${area.x}%`, top: `${area.y}%`, width: `${area.width}%`, height: 0, paddingBottom: `${area.width}%` };
  }
  return { left: `${area.x}%`, top: `${area.y}%`, width: `${area.width}%`, height: `${area.height}%` };
}

/** target, rel and routing attributes of a link. The href is set at the element itself. */
function linkAttributes(link: IRenderableLink): React.AnchorHTMLAttributes<HTMLAnchorElement> & { 'data-interception'?: string } {
  const external = link.check.kind === 'external';
  const relParts: string[] = [];
  if (link.area.openInNewTab || external) {
    relParts.push('noopener', 'noreferrer');
  }
  if (external) {
    relParts.push('nofollow');
  }
  return {
    target: link.area.openInNewTab ? '_blank' : undefined,
    rel: relParts.length ? relParts.join(' ') : undefined,
    // Do not route external links through SharePoint page routing
    'data-interception': external ? 'off' : undefined
  };
}

/**
 * Display mode: image + list of absolutely positioned links in percentages.
 * Every URL is validated again on render. Invalid or disallowed links are not rendered.
 */
export const ImageMapViewer: React.FunctionComponent<IImageMapViewerProps> = (props: IImageMapViewerProps) => {
  const classNames = useClassNames();
  const { imageUrl, policy, areas, onPreviewClick, showLinkList, stretch, imageAlt, hintAreas } = props;
  const [failed, setFailed] = React.useState<boolean>(false);

  React.useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  if (!imageUrl) {
    return null;
  }

  const imageCheck = checkImageUrl(imageUrl, policy);
  const links: IRenderableLink[] = [];
  areas.forEach((area: IImageArea, index: number) => {
    const check = checkLinkUrl(area.url, policy);
    if (check.valid) {
      // Accessible name: title, otherwise a neutral fallback. The URL is never used as link text.
      const label = cleanText(area.title, policy.maxTitleLength) || formatText(strings.linkFallback, index + 1);
      const tooltip = cleanText(area.tooltip, policy.maxTooltipLength) || label;
      links.push({ area, check, label, tooltip });
    }
  });

  const onClick = (area: IImageArea) => onPreviewClick
    ? (e: React.MouseEvent<HTMLAnchorElement>) => { e.preventDefault(); onPreviewClick!(area); }
    : undefined;

  const imageUsable = imageCheck.valid && !failed;
  const showTextLinks = links.length > 0 && (showLinkList || !imageUsable);

  return (
    <div className={css(classNames.outer, stretch && classNames.outerStretch)}>
      {!imageCheck.valid && (
        <MessageBar messageBarType={MessageBarType.blocked}>{strings.imageBlocked}</MessageBar>
      )}
      {imageCheck.valid && failed && (
        <MessageBar messageBarType={MessageBarType.error}>{strings.imageLoadFailed}</MessageBar>
      )}

      {imageUsable && (
        <div
          className={css(classNames.frame, stretch && classNames.frameStretch)}
          role="group"
          aria-label={links.length > 0 ? formatText(strings.interactiveGraphic, links.length) : undefined}
        >
          <img
            src={imageCheck.url}
            alt={imageAlt || ''}
            className={css(classNames.image, stretch && classNames.imageStretch)}
            onError={() => setFailed(true)}
            draggable={false}
          />
          {links.length > 0 && (
            <ul className={classNames.areaList}>
              {links.map((link: IRenderableLink) => {
                const suffix = link.area.openInNewTab ? strings.newTabSuffix : '';
                return (
                  <li key={link.area.id} className={classNames.areaItem} style={positionStyle(link.area)}>
                    <a
                      href={link.check.url}
                      {...linkAttributes(link)}
                      aria-label={link.label + suffix}
                      title={link.tooltip + suffix}
                      className={getViewAreaClass(link.area, hintAreas)}
                      onClick={onClick(link.area)}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {showTextLinks && (
        <ul className={classNames.textLinks} aria-label={imageUsable ? strings.linksAsList : strings.graphicLinks}>
          {links.map((link: IRenderableLink) => (
            <li key={link.area.id}>
              <a
                href={link.check.url}
                {...linkAttributes(link)}
                className={classNames.textLink}
                title={link.tooltip !== link.label ? link.tooltip : undefined}
                onClick={onClick(link.area)}
              >
                {link.label}
                {link.area.openInNewTab && <span className={classNames.srOnly}>{strings.newTabSuffix}</span>}
                {link.area.openInNewTab && <Icon iconName="OpenInNewWindow" className={classNames.newTabIcon} aria-hidden={true} />}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
