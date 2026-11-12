import * as React from 'react';
import { Dialog, DialogFooter, DialogType } from '@fluentui/react/lib/Dialog';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { TextField } from '@fluentui/react/lib/TextField';
import { checkAlt } from '../utils/validation';
import { strings } from '../loc/strings';

export interface IAltTextDialogProps {
  isOpen: boolean;
  value: string;
  maxLength: number;
  onSave: (value: string) => void;
  onDismiss: () => void;
}

export const AltTextDialog: React.FunctionComponent<IAltTextDialogProps> = (props: IAltTextDialogProps) => {
  const { value, isOpen, maxLength, onDismiss, onSave } = props;
  const [draft, setDraft] = React.useState<string>(value);
  React.useEffect(() => { if (isOpen) { setDraft(value); } }, [isOpen]);
  const error = checkAlt(draft, maxLength);

  return (
    <Dialog
      hidden={!isOpen}
      onDismiss={onDismiss}
      dialogContentProps={{
        type: DialogType.normal,
        title: strings.altDialogTitle,
        subText: strings.altDialogSubText
      }}
      modalProps={{ isBlocking: true }}
      minWidth={420}
    >
      <TextField
        label={strings.altLabel}
        required={true}
        multiline={true}
        autoAdjustHeight={true}
        rows={3}
        maxLength={maxLength}
        value={draft}
        onChange={(e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, v?: string) => setDraft((v || '').replace(/[\r\n]+/g, ' '))}
        errorMessage={error}
        description={error ? undefined : strings.charCounter(draft.length, maxLength)}
      />
      <DialogFooter>
        <PrimaryButton text={strings.save} disabled={!!error} onClick={() => onSave(draft.trim())} />
        <DefaultButton text={strings.cancel} onClick={onDismiss} />
      </DialogFooter>
    </Dialog>
  );
};
