import * as React from 'react';
import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import { Pivot, PivotItem } from '@fluentui/react/lib/Pivot';
import { TextField } from '@fluentui/react/lib/TextField';
import { PrimaryButton, DefaultButton, ActionButton } from '@fluentui/react/lib/Button';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Text } from '@fluentui/react/lib/Text';
import { Icon } from '@fluentui/react/lib/Icon';
import { css } from '@fluentui/react/lib/Utilities';
import { ISecurityPolicy } from '../config/securityConfig';
import { IImageFile, ImageService } from '../services/ImageService';
import { acceptAttribute, describeAllowedTypes, IValidatedImage, validateImageFile } from '../utils/fileValidation';
import { checkImageUrl } from '../utils/validation';
import { strings } from '../loc/strings';
import { classNames } from './styles';

export interface IImagePickerPanelProps {
  isOpen: boolean;
  service: ImageService;
  policy: ISecurityPolicy;
  folder: string;
  currentUrl: string;
  hasAreas: boolean;
  onSelect: (url: string) => void;
  onDismiss: () => void;
}

export const ImagePickerPanel: React.FunctionComponent<IImagePickerPanelProps> = (props: IImagePickerPanelProps) => {
  const [tab, setTab] = React.useState<string>('library');
  const [images, setImages] = React.useState<IImageFile[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [uploading, setUploading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [status, setStatus] = React.useState<string>('');
  const [urlInput, setUrlInput] = React.useState<string>(props.currentUrl || '');
  const [dragOver, setDragOver] = React.useState<boolean>(false);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const alive = React.useRef<boolean>(true);

  React.useEffect(() => () => { alive.current = false; }, []);

  const load = () => {
    setLoading(true);
    setError(undefined);
    props.service.getImages(props.folder)
      .then((result: IImageFile[]) => {
        if (!alive.current) { return; }
        setImages(result);
        setStatus(strings.imagesFound(result.length));
      })
      .catch((e: Error) => { if (alive.current) { setError(strings.imagesLoadFailed(e.message)); } })
      .then(() => { if (alive.current) { setLoading(false); } });
  };

  React.useEffect(() => {
    if (props.isOpen) {
      setUrlInput(props.currentUrl || '');
      load();
    }
  }, [props.isOpen, props.folder]);

  const handleFiles = (files: FileList | null) => {
    const file = files && files[0];
    if (!file) { return; }
    setError(undefined);
    setUploading(true);
    setStatus(strings.checkingAndUploading);
    validateImageFile(file, props.policy)
      .then((valid: IValidatedImage) => props.service.upload(props.folder, file, valid.fileName))
      .then((uploaded: IImageFile) => {
        if (!alive.current) { return; }
        setUploading(false);
        setStatus(strings.uploadedAndSelected(uploaded.name));
        props.onSelect(uploaded.serverRelativeUrl);
      })
      .catch((e: Error) => {
        if (!alive.current) { return; }
        setUploading(false);
        setStatus('');
        setError(strings.uploadFailed(e.message));
      });
  };

  const urlCheck = checkImageUrl(urlInput, props.policy);
  const allowed = describeAllowedTypes(props.policy);
  const maxMb = Math.round(props.policy.maxUploadBytes / 1024 / 1024);

  return (
    <Panel
      isOpen={props.isOpen}
      type={PanelType.medium}
      headerText={strings.chooseImage}
      closeButtonAriaLabel={strings.closePicker}
      onDismiss={props.onDismiss}
      isLightDismiss={true}
    >
      <div className={classNames.srOnly} role="status" aria-live="polite">{status}</div>
      {props.hasAreas && (
        <MessageBar messageBarType={MessageBarType.info}>{strings.areasKept}</MessageBar>
      )}
      {error && (
        <MessageBar messageBarType={MessageBarType.error} onDismiss={() => setError(undefined)} dismissButtonAriaLabel={strings.closeMessage}>
          {error}
        </MessageBar>
      )}

      <Pivot
        selectedKey={tab}
        onLinkClick={(item?: PivotItem) => item && setTab(item.props.itemKey || 'library')}
        aria-label={strings.imageSource}
      >
        <PivotItem headerText={strings.tabLibrary} itemKey="library" itemIcon="Library">
          <Text block={true} variant="small" style={{ marginTop: 8 }}>
            {strings.folderInfo(props.service.resolveFolder(props.folder))}
          </Text>
          <ActionButton iconProps={{ iconName: 'Refresh' }} text={strings.refreshList} onClick={load} disabled={loading} />
          {loading && <Spinner size={SpinnerSize.large} label={strings.loadingImages} ariaLive="polite" />}
          {!loading && images.length === 0 && !error && (
            <Text block={true} style={{ marginTop: 8 }}>{strings.noImages}</Text>
          )}
          {!loading && images.length > 0 && (
            <ul className={classNames.grid} style={{ listStyle: 'none', padding: 0 }} aria-label={strings.imagesInFolder}>
              {images.map((img: IImageFile) => {
                const current = img.serverRelativeUrl === props.currentUrl;
                return (
                  <li key={img.serverRelativeUrl} className={css(classNames.tile, current && classNames.tileSelected)} style={{ padding: 0 }}>
                    <button
                      type="button"
                      style={{ width: '100%', border: 'none', background: 'transparent', padding: 4, cursor: 'pointer', textAlign: 'left' }}
                      onClick={() => props.onSelect(img.serverRelativeUrl)}
                      aria-pressed={current}
                      aria-label={strings.selectImageAria(img.name, current)}
                    >
                      <div
                        className={classNames.tileImage}
                        aria-hidden={true}
                        style={{ backgroundImage: `url("${encodeURI(img.serverRelativeUrl).replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/'/g, '%27')}")` }}
                      />
                      <span className={classNames.tileName} aria-hidden={true}>{img.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </PivotItem>

        <PivotItem headerText={strings.tabUpload} itemKey="upload" itemIcon="Upload">
          <div
            className={css(classNames.dropZone, dragOver && classNames.dropZoneActive)}
            onDragOver={(e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e: React.DragEvent<HTMLDivElement>) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
          >
            {uploading ? (
              <Spinner size={SpinnerSize.large} label={strings.uploadingSpinner} ariaLive="polite" />
            ) : (
              <div>
                <Icon iconName="CloudUpload" className={classNames.placeholderIcon} aria-hidden={true} />
                <Text block={true} style={{ margin: '8px 0 12px' }}>{strings.dropHere}</Text>
                <PrimaryButton
                  text={strings.chooseFile}
                  onClick={() => fileInput.current && fileInput.current.click()}
                  aria-describedby="imagemap-upload-rules"
                />
                <Text block={true} variant="small" style={{ marginTop: 12 }} id="imagemap-upload-rules">
                  {strings.uploadRules(allowed, maxMb)} {strings.uploadTarget(props.service.resolveFolder(props.folder))}
                </Text>
              </div>
            )}
            <input
              ref={fileInput}
              type="file"
              accept={acceptAttribute(props.policy)}
              style={{ display: 'none' }}
              tabIndex={-1}
              aria-hidden={true}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                handleFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </div>
        </PivotItem>

        <PivotItem headerText={strings.tabAddress} itemKey="url" itemIcon="Link">
          <TextField
            label={strings.imageUrlField}
            required={true}
            placeholder={strings.imageUrlPlaceholder}
            value={urlInput}
            maxLength={props.policy.maxUrlLength}
            autoComplete="off"
            spellCheck={false}
            onChange={(e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, v?: string) => setUrlInput(v || '')}
            errorMessage={urlInput ? urlCheck.error : undefined}
            description={props.policy.imagesSameHostOnly ? strings.sameHostOnly : undefined}
          />
          {urlInput && urlCheck.suggestion && (
            <ActionButton iconProps={{ iconName: 'AutoEnhanceOn' }} text={strings.fixTo(urlCheck.suggestion)}
              onClick={() => setUrlInput(urlCheck.suggestion || '')} />
          )}
          <div style={{ marginTop: 12 }}>
            <PrimaryButton text={strings.apply} disabled={!urlCheck.valid} onClick={() => props.onSelect(urlCheck.url)} />
            <DefaultButton text={strings.cancel} style={{ marginLeft: 8 }} onClick={props.onDismiss} />
          </div>
        </PivotItem>
      </Pivot>
    </Panel>
  );
};
