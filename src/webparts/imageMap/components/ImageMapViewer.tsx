import * as React from 'react';
import { css } from '@fluentui/react/lib/Utilities';
import { Icon } from '@fluentui/react/lib/Icon';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { ISecurityPolicy } from '../config/securityConfig';
import { IImageArea } from '../models/IImageMap';
import { getViewAreaClass } from '../utils/hoverStyles';
import { checkImageUrl, checkLinkUrl, cleanText, IUrlCheck } from '../utils/validation';
import { strings } from '../loc/strings';
import { classNames } from './styles';

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
    href: link.check.url,
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
  const [failed, setFailed] = React.useState<boolean>(false);

  React.useEffect(() => {
    setFailed(false);
  }, [props.imageUrl]);

  if (!props.imageUrl) {
    return null;
  }

  const imageCheck = checkImageUrl(props.imageUrl, props.policy);
  const links: IRenderableLink[] = [];
  props.areas.forEach((area: IImageArea, index: number) => {
    const check = checkLinkUrl(area.url, props.policy);
    if (check.valid) {
      // Accessible name: title, otherwise a neutral fallback. The URL is never used as link text.
      const label = cleanText(area.title, props.policy.maxTitleLength) || strings.linkFallback(index + 1);
      const tooltip = cleanText(area.tooltip, props.policy.maxTooltipLength) || label;
      links.push({ area, check, label, tooltip });
    }
  });

  const onClick = (area: IImageArea) => props.onPreviewClick
    ? (e: React.MouseEvent<HTMLAnchorElement>) => { e.preventDefault(); props.onPreviewClick!(area); }
    : undefined;

  const imageUsable = imageCheck.valid && !failed;
  const showTextLinks = links.length > 0 && (props.showLinkList || !imageUsable);

  return (
    <div className={css(classNames.outer, props.stretch && classNames.outerStretch)}>
      {!imageCheck.valid && (
        <MessageBar messageBarType={MessageBarType.blocked}>{strings.imageBlocked}</MessageBar>
      )}
      {imageCheck.valid && failed && (
        <MessageBar messageBarType={MessageBarType.error}>{strings.imageLoadFailed}</MessageBar>
      )}

      {imageUsable && (
        <div
          className={css(classNames.frame, props.stretch && classNames.frameStretch)}
          role="group"
          aria-label={links.length > 0 ? strings.interactiveGraphic(links.length) : undefined}
        >
          <img
            src={imageCheck.url}
            alt={props.imageAlt || ''}
            className={css(classNames.image, props.stretch && classNames.imageStretch)}
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
                      {...linkAttributes(link)}
                      aria-label={link.label + suffix}
                      title={link.tooltip + suffix}
                      className={getViewAreaClass(link.area, props.hintAreas)}
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
