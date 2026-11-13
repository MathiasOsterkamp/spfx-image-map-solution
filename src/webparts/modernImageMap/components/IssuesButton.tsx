import * as React from 'react';
import { CommandBarButton } from '@fluentui/react/lib/Button';
import { Callout, DirectionalHint } from '@fluentui/react/lib/Callout';
import { Link } from '@fluentui/react/lib/Link';
import { Text } from '@fluentui/react/lib/Text';
import { getId } from '@fluentui/react/lib/Utilities';
import { formatText } from '../loc/template';
import { handleRovingKeyDown } from '../utils/rovingFocus';
import { IValidationIssue } from '../utils/validation';
import * as strings from 'ModernImageMapWebPartStrings';

export interface IIssuesButtonProps {
  issues: IValidationIssue[];
  onSelect: (issue: IValidationIssue) => void;
}

/** Issue counter in the toolbar: icon with a short text ("2 issues" / "No issues"). Opens a list with jump links to the affected locations. */
export const IssuesButton: React.FunctionComponent<IIssuesButtonProps> = (props: IIssuesButtonProps) => {
  const { issues, onSelect } = props;
  const [open, setOpen] = React.useState<boolean>(false);
  const buttonRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useRef<string>(getId('imagemap-issues'));
  const count = issues.length;
  const label = formatText(strings.issuesLabel, count);

  return (
    <div ref={buttonRef} style={{ display: 'flex', height: '100%' }}>
      <CommandBarButton
        text={label}
        iconProps={{ iconName: count ? 'Warning' : 'CheckMark' }}
        ariaLabel={`${label}${count ? strings.openList : ''}`}
        role="menuitem"
        aria-haspopup={count ? 'dialog' : undefined}
        aria-expanded={count ? open : undefined}
        onClick={() => count && setOpen(!open)}
        styles={{
          root: { padding: '0 8px', minWidth: 0 },
          icon: { color: count ? '#a4262c' : '#107c10' },
          label: { fontSize: 12, whiteSpace: 'nowrap', fontWeight: count ? 600 : 400, color: count ? '#a4262c' : undefined }
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
          {/* role="presentation": only catches the arrow keys bubbling up from the links. */}
          <div role="presentation" onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => handleRovingKeyDown(e, 'vertical')}>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {issues.map((issue: IValidationIssue) => (
                <li key={`${issue.areaId || 'image'}|${issue.field}|${issue.message}`}style={{ marginBottom: 6 }}>
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
