import * as React from 'react';
import { Callout, DirectionalHint } from '@fluentui/react/lib/Callout';
import { CommandBarButton } from '@fluentui/react/lib/Button';
import { Link } from '@fluentui/react/lib/Link';
import { Text } from '@fluentui/react/lib/Text';
import { handleRovingKeyDown } from '../utils/rovingFocus';
import { getId } from '@fluentui/react/lib/Utilities';
import { IValidationIssue } from '../utils/validation';
import { strings } from '../loc/strings';

export interface IIssuesButtonProps {
  issues: IValidationIssue[];
  onSelect: (issue: IValidationIssue) => void;
}

/** "n issues" counter in the toolbar. Opens a list with jump links to the affected locations. */
export const IssuesButton: React.FunctionComponent<IIssuesButtonProps> = (props: IIssuesButtonProps) => {
  const { issues, onSelect } = props;
  const [open, setOpen] = React.useState<boolean>(false);
  const buttonRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useRef<string>(getId('imagemap-issues'));
  const count = issues.length;
  const label = strings.issuesLabel(count);

  return (
    <div ref={buttonRef} style={{ display: 'flex', height: '100%' }}>
      <CommandBarButton
        text={String(count)}
        iconProps={{ iconName: count ? 'Warning' : 'CheckMark' }}
        ariaLabel={`${label}${count ? strings.openList : ''}`}
        title={label}
        role="menuitem"
        aria-haspopup={count ? 'dialog' : undefined}
        aria-expanded={count ? open : undefined}
        onClick={() => count && setOpen(!open)}
        styles={{
          root: { padding: '0 8px', minWidth: 0 },
          icon: { color: count ? '#a4262c' : '#107c10' },
          label: { fontWeight: count ? 600 : 400, color: count ? '#a4262c' : undefined }
        }}
      />
      {open && count > 0 && (
        <Callout
          target={buttonRef.current}
          onDismiss={() => setOpen(false)}
          directionalHint={DirectionalHint.bottomRightEdge}
          setInitialFocus={true}
          role="dialog"
          ariaLabelledBy={titleId.current}
          styles={{ calloutMain: { padding: '12px 16px', maxWidth: 360 } }}
        >
          <Text id={titleId.current} variant="mediumPlus" block={true} style={{ fontWeight: 600, marginBottom: 8 }}>
            {label}
          </Text>
          <div onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => handleRovingKeyDown(e, 'vertical')}>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {issues.map((issue: IValidationIssue, i: number) => (
                <li key={i} style={{ marginBottom: 6 }}>
                  <Link onClick={() => { setOpen(false); onSelect(issue); }}>{issue.message}</Link>
                </li>
              ))}
            </ul>
          </div>
          <Text variant="small" block={true} style={{ marginTop: 8 }}>{strings.issuesFooter}</Text>
        </Callout>
      )}
    </div>
  );
};
