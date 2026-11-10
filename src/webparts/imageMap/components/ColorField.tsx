import * as React from 'react';
import { Label } from '@fluentui/react/lib/Label';
import { DefaultButton } from '@fluentui/react/lib/Button';
import { Callout, DirectionalHint } from '@fluentui/react/lib/Callout';
import { ColorPicker } from '@fluentui/react/lib/ColorPicker';
import { IColor } from '@fluentui/react/lib/Color';
import { getId } from '@fluentui/react/lib/Utilities';
import { safeColor } from '../utils/sanitize';
import { classNames } from './styles';
import { strings } from '../loc/strings';

export interface IColorFieldProps {
  label: string;
  value: string;
  fallback: string;
  allowAlpha?: boolean;
  onChange: (value: string) => void;
}

export const ColorField: React.FunctionComponent<IColorFieldProps> = (props: IColorFieldProps) => {
  const [open, setOpen] = React.useState<boolean>(false);
  const targetRef = React.useRef<HTMLDivElement>(null);
  const labelId = React.useRef<string>(getId('imagemap-color'));
  const value = safeColor(props.value, props.fallback);

  return (
    <div>
      <Label id={labelId.current}>{props.label}</Label>
      <div ref={targetRef} style={{ display: 'inline-block' }}>
        <DefaultButton
          className={classNames.swatchButton}
          onClick={() => setOpen(!open)}
          ariaLabel={strings.openColorPicker(props.label, value)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span className={classNames.swatchOuter} aria-hidden={true}>
            <span className={classNames.swatchInner} style={{ backgroundColor: value }} />
          </span>
          <span>{value}</span>
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
            color={value}
            alphaType={props.allowAlpha ? 'alpha' : 'none'}
            showPreview={true}
            onChange={(ev: React.SyntheticEvent<HTMLElement>, color: IColor) => props.onChange(color.str)}
          />
        </Callout>
      )}
    </div>
  );
};
