import * as React from 'react';
import { Dialog, DialogFooter, DialogType } from '@fluentui/react/lib/Dialog';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { TextField } from '@fluentui/react/lib/TextField';
import { checkAlt } from '../utils/validation';

export interface IAltTextDialogProps {
  isOpen: boolean;
  value: string;
  maxLength: number;
  onSave: (value: string) => void;
  onDismiss: () => void;
}

export const AltTextDialog: React.FunctionComponent<IAltTextDialogProps> = (props: IAltTextDialogProps) => {
  const [draft, setDraft] = React.useState<string>(props.value);
  React.useEffect(() => { if (props.isOpen) { setDraft(props.value); } }, [props.isOpen]);
  const error = checkAlt(draft, props.maxLength);

  return (
    <Dialog
      hidden={!props.isOpen}
      onDismiss={props.onDismiss}
      dialogContentProps={{
        type: DialogType.normal,
        title: 'Alternativtext des Bildes',
        subText: 'Beschreibt den Bildinhalt für Screenreader, z. B. „Lageplan des Erdgeschosses“. Die Links werden über ihren Titel angesagt.'
      }}
      modalProps={{ isBlocking: true }}
      minWidth={420}
    >
      <TextField
        label="Alternativtext"
        required={true}
        multiline={true}
        autoAdjustHeight={true}
        rows={3}
        maxLength={props.maxLength}
        value={draft}
        onChange={(e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, v?: string) => setDraft((v || '').replace(/[\r\n]+/g, ' '))}
        errorMessage={error}
        description={error ? undefined : `${draft.length} von ${props.maxLength} Zeichen`}
      />
      <DialogFooter>
        <PrimaryButton text="Speichern" disabled={!!error} onClick={() => props.onSave(draft.trim())} />
        <DefaultButton text="Abbrechen" onClick={props.onDismiss} />
      </DialogFooter>
    </Dialog>
  );
};
