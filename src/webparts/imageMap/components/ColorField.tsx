import * as React from 'react';
import { Label } from '@fluentui/react/lib/Label';
import { DefaultButton } from '@fluentui/react/lib/Button';
import { Callout, DirectionalHint } from '@fluentui/react/lib/Callout';
import { ColorPicker } from '@fluentui/react/lib/ColorPicker';
import { IColor } from '@fluentui/react/lib/Color';
import { getId } from '@fluentui/react/lib/Utilities';
import { safeColor } from '../utils/sanitize';
import { useClassNames } from './styles';
import { strings } from '../loc/strings';

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
          ariaLabel={strings.openColorPicker(label, safeValue)}
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
