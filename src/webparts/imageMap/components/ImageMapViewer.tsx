import * as React from 'react';
import { css } from '@fluentui/react/lib/Utilities';
import { Icon } from '@fluentui/react/lib/Icon';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { ISecurityPolicy } from '../config/securityConfig';
import { IImageArea } from '../models/IImageMap';
import { getViewAreaClass } from '../utils/hoverStyles';
import { checkImageUrl, checkLinkUrl, cleanText, IUrlCheck } from '../utils/validation';
import { classNames } from './styles';

export interface IImageMapViewerProps {
  imageUrl: string;
  imageAlt: string;
  areas: IImageArea[];
  stretch: boolean;
  hintAreas: boolean;
  showLinkList: boolean;
  policy: ISecurityPolicy;
  /** Nur für den Testmodus im Editor: Klick abfangen statt zu navigieren. */
  onPreviewClick?: (area: IImageArea) => void;
}

interface IRenderableLink {
  area: IImageArea;
  check: IUrlCheck;
  label: string;
  tooltip: string;
}

const NEW_TAB_SUFFIX = ' (öffnet in neuem Tab)';

/**
 * Position im Bild. Kreise erhalten ihre Höhe über padding-bottom: Prozent-Innenabstände beziehen
 * sich immer auf die BREITE des Containers. Dadurch bleibt der Kreis bei jeder Bildgröße rund.
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
    // Externe Links nicht durch das SharePoint-Seitenrouting leiten
    'data-interception': external ? 'off' : undefined
  };
}

/**
 * Anzeigemodus: Bild + Liste absolut positionierter Links in Prozentwerten.
 * Jede URL wird beim Rendern erneut geprüft. Ungültige oder nicht erlaubte Links werden nicht ausgegeben.
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
      // Barrierefreier Name: Titel, sonst neutraler Ersatz. Die URL wird nie als Linktext verwendet.
      const label = cleanText(area.title, props.policy.maxTitleLength) || `Link ${index + 1}`;
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
        <MessageBar messageBarType={MessageBarType.blocked}>
          Das Bild wurde aus Sicherheitsgründen nicht geladen.
        </MessageBar>
      )}
      {imageCheck.valid && failed && (
        <MessageBar messageBarType={MessageBarType.error}>
          Das Bild konnte nicht geladen werden.
        </MessageBar>
      )}

      {imageUsable && (
        <div
          className={css(classNames.frame, props.stretch && classNames.frameStretch)}
          role="group"
          aria-label={links.length > 0 ? `Interaktive Grafik mit ${links.length} ${links.length === 1 ? 'Link' : 'Links'}` : undefined}
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
                const suffix = link.area.openInNewTab ? NEW_TAB_SUFFIX : '';
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
        <ul className={classNames.textLinks} aria-label={imageUsable ? 'Links der Grafik als Liste' : 'Links der Grafik'}>
          {links.map((link: IRenderableLink) => (
            <li key={link.area.id}>
              <a
                {...linkAttributes(link)}
                className={classNames.textLink}
                title={link.tooltip !== link.label ? link.tooltip : undefined}
                onClick={onClick(link.area)}
              >
                {link.label}
                {link.area.openInNewTab && <span className={classNames.srOnly}>{NEW_TAB_SUFFIX}</span>}
                {link.area.openInNewTab && <Icon iconName="OpenInNewWindow" className={classNames.newTabIcon} aria-hidden={true} />}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
