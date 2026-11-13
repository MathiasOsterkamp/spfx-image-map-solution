import * as React from 'react';
import { DefaultButton } from '@fluentui/react/lib/Button';
import { Callout, DirectionalHint } from '@fluentui/react/lib/Callout';
import { IColor } from '@fluentui/react/lib/Color';
import { ColorPicker } from '@fluentui/react/lib/ColorPicker';
import { Label } from '@fluentui/react/lib/Label';
import { getId } from '@fluentui/react/lib/Utilities';
import { useClassNames } from './styles';
import { formatText } from '../loc/template';
import { safeColor } from '../utils/sanitize';
import * as strings from 'ModernImageMapWebPartStrings';

export interface IColorFieldProps {
  label: string;
  value: string;
  fallback: string;
  allowAlpha?: boolean;
  onChange: (value: string) => void;
}

export const ColorField: React.FunctionComponent<IColorFieldProps> = (props: IColorFieldProps) => {
  const classNames = useClassNames();
  const { value, fallback, label, allowAlpha, onChange } = props;
  const [open, setOpen] = React.useState<boolean>(false);
  const targetRef = React.useRef<HTMLDivElement>(null);
  const labelId = React.useRef<string>(getId('imagemap-color'));
  const safeValue = safeColor(value, fallback);

  return (
    <div>
      <Label id={labelId.current}>{label}</Label>
      <div ref={targetRef} style={{ display: 'inline-block' }}>
        <DefaultButton
          className={classNames.swatchButton}
          onClick={() => setOpen(!open)}
          ariaLabel={formatText(strings.openColorPicker, label, safeValue)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span className={classNames.swatchOuter} aria-hidden={true}>
            <span className={classNames.swatchInner} style={{ backgroundColor: safeValue }} />
          </span>
          <span>{safeValue}</span>
        </DefaultButton>
      </div>
      {open && (
        <Callout
          target={targetRef.current}
          onDismiss={() => setOpen(false)}
          directionalHint={DirectionalHint.bottomLeftEdge}
          setInitialFocus={true}
          gapSpace={4}
          role="dialog"
          ariaLabelledBy={labelId.current}
        >
          <ColorPicker
            color={safeValue}
            alphaType={allowAlpha ? 'alpha' : 'none'}
            showPreview={true}
            onChange={(ev: React.SyntheticEvent<HTMLElement>, color: IColor) => onChange(color.str)}
          />
        </Callout>
      )}
    </div>
  );
};
