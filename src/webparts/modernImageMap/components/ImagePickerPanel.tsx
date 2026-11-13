import * as React from 'react';
import { Breadcrumb, IBreadcrumbItem } from '@fluentui/react/lib/Breadcrumb';
import { PrimaryButton, DefaultButton, ActionButton, IconButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import { Pivot, PivotItem } from '@fluentui/react/lib/Pivot';
import { SearchBox } from '@fluentui/react/lib/SearchBox';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Text } from '@fluentui/react/lib/Text';
import { TextField } from '@fluentui/react/lib/TextField';
import { css } from '@fluentui/react/lib/Utilities';
import { useClassNames } from './styles';
import { ISecurityPolicy } from '../config/securityConfig';
import { formatText } from '../loc/template';
import { IImageFile, IImageFolder, IImagePage, ImageService, isSameImageUrl } from '../services/ImageService';
import { acceptAttribute, describeAllowedTypes, IValidatedImage, validateImageFile } from '../utils/fileValidation';
import { checkImageUrl } from '../utils/validation';
import * as strings from 'ModernImageMapWebPartStrings';

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
  const classNames = useClassNames();
  const { currentUrl, service, folder, isOpen, policy, onSelect, onDismiss, hasAreas } = props;
  const [tab, setTab] = React.useState<string>('library');
  const [images, setImages] = React.useState<IImageFile[]>([]);
  const [folders, setFolders] = React.useState<IImageFolder[]>([]);
  /** Subfolders below the configured folder the user navigated into */
  const [subFolders, setSubFolders] = React.useState<string[]>([]);
  /** Paging token for the next page (undefined = everything loaded) */
  const [next, setNext] = React.useState<string | undefined>(undefined);
  const [searchInput, setSearchInput] = React.useState<string>('');
  /** Search text the displayed list was loaded with */
  const [query, setQuery] = React.useState<string>('');
  const [loadingMore, setLoadingMore] = React.useState<boolean>(false);
  const requestId = React.useRef<number>(0);
  const searchTimer = React.useRef<number | undefined>(undefined);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [uploading, setUploading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [status, setStatus] = React.useState<string>('');
  const [urlInput, setUrlInput] = React.useState<string>(currentUrl || '');
  const [dragOver, setDragOver] = React.useState<boolean>(false);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const alive = React.useRef<boolean>(true);

  React.useEffect(() => () => { alive.current = false; }, []);

  const announceCount = (count: number, more: boolean) =>
    setStatus(formatText(strings.imagesFound, count) + (more ? ' ' + strings.moreAvailable : ''));

  /** Loads the first page of a folder. Responses of outdated requests are discarded. */
  const load = (path: string[], search: string) => {
    const id = ++requestId.current;
    const isCurrent = () => alive.current && id === requestId.current;
    setSubFolders(path);
    setQuery(search);
    setLoading(true);
    setLoadingMore(false);
    setError(undefined);
    setFolders([]);
    setImages([]);
    setNext(undefined);
    Promise.all([
      service.getFolders(folder, path),
      service.getImagePage(folder, path, search)
    ])
      .then((result: [IImageFolder[], IImagePage]) => {
        if (!isCurrent()) { return; }
        setFolders(result[0]);
        setImages(result[1].images);
        setNext(result[1].next);
        announceCount(result[1].images.length, !!result[1].next);
      })
      .catch((e: Error) => { if (isCurrent()) { setError(formatText(strings.imagesLoadFailed, e.message)); } })
      .then(() => { if (isCurrent()) { setLoading(false); } });
  };

  const loadMore = () => {
    if (!next || loadingMore) { return; }
    const id = requestId.current;
    const isCurrent = () => alive.current && id === requestId.current;
    setLoadingMore(true);
    setError(undefined);
    service.getImagePage(folder, subFolders, query, next)
      .then((page: IImagePage) => {
        if (!isCurrent()) { return; }
        const all = images.concat(page.images);
        setImages(all);
        setNext(page.next);
        announceCount(all.length, !!page.next);
      })
      .catch((e: Error) => { if (isCurrent()) { setError(formatText(strings.imagesLoadFailed, e.message)); } })
      .then(() => { if (isCurrent()) { setLoadingMore(false); } });
  };

  const clearSearchTimer = () => {
    if (searchTimer.current !== undefined) {
      window.clearTimeout(searchTimer.current);
      searchTimer.current = undefined;
    }
  };

  const openFolder = (path: string[]) => {
    clearSearchTimer();
    setSearchInput('');
    load(path, '');
  };

  /** Searches after a short typing pause, or immediately (Enter / clear). */
  const search = (value: string, immediately: boolean) => {
    clearSearchTimer();
    setSearchInput(value);
    const run = () => {
      searchTimer.current = undefined;
      if (value.trim() !== query) { load(subFolders, value.trim()); }
    };
    if (immediately) { run(); } else { searchTimer.current = window.setTimeout(run, 400); }
  };

  React.useEffect(() => clearSearchTimer, []);

  React.useEffect(() => {
    if (isOpen) {
      setUrlInput(currentUrl || '');
      openFolder([]);
    }
  }, [isOpen, folder]);

  const rootName = (folder || '').replace(/^\/+|\/+$/g, '') || 'SiteAssets';
  const breadcrumb: IBreadcrumbItem[] = [rootName].concat(subFolders).map((name: string, index: number) => ({
    key: String(index),
    text: name,
    isCurrentItem: index === subFolders.length,
    onClick: index === subFolders.length ? undefined : () => openFolder(subFolders.slice(0, index))
  }));
  const needle = query.toLowerCase();
  const visibleFolders = needle
    ? folders.filter((f: IImageFolder) => f.name.toLowerCase().indexOf(needle) >= 0)
    : folders;
  const tileButtonStyle: React.CSSProperties = {
    width: '100%', border: 'none', background: 'transparent', padding: 4, cursor: 'pointer', textAlign: 'left'
  };

  const handleFiles = (files: FileList | null) => {
    const file = files && files[0];
    if (!file) { return; }
    setError(undefined);
    setUploading(true);
    setStatus(strings.checkingAndUploading);
    validateImageFile(file, policy)
      .then((valid: IValidatedImage) => service.upload(folder, file, valid.fileName))
      .then((uploaded: IImageFile) => {
        if (!alive.current) { return; }
        setUploading(false);
        setStatus(formatText(strings.uploadedAndSelected, uploaded.name));
        onSelect(uploaded.serverRelativeUrl);
      })
      .catch((e: Error) => {
        if (!alive.current) { return; }
        setUploading(false);
        setStatus('');
        setError(formatText(strings.uploadFailed, e.message));
      });
  };

  const urlCheck = checkImageUrl(urlInput, policy);
  const allowed = describeAllowedTypes(policy);
  const maxMb = Math.round(policy.maxUploadBytes / 1024 / 1024);

  return (
    <Panel
      isOpen={isOpen}
      type={PanelType.medium}
      headerText={strings.chooseImage}
      closeButtonAriaLabel={strings.closePicker}
      onDismiss={onDismiss}
      isLightDismiss={true}
    >
      <div className={classNames.srOnly} role="status" aria-live="polite">{status}</div>
      {hasAreas && (
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
          <Breadcrumb
            items={breadcrumb}
            ariaLabel={strings.folderPath}
            maxDisplayedItems={3}
            styles={{ root: { margin: '4px 0 0' }, itemLink: { fontSize: 14 }, item: { fontSize: 14 } }}
          />
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
            <SearchBox
              placeholder={strings.searchImages}
              ariaLabel={strings.searchImages}
              value={searchInput}
              onChange={(e?: React.ChangeEvent<HTMLInputElement>, v?: string) => search(v || '', !v)}
              onSearch={(v: string) => search(v || '', true)}
              styles={{ root: { flexGrow: 1 } }}
            />
            <IconButton
              iconProps={{ iconName: 'Refresh' }}
              title={strings.refreshList}
              ariaLabel={strings.refreshList}
              disabled={loading}
              onClick={() => load(subFolders, query)}
            />
          </div>
          {loading && <Spinner size={SpinnerSize.large} label={strings.loadingImages} ariaLive="polite" style={{ marginTop: 16 }} />}
          {!loading && images.length === 0 && visibleFolders.length === 0 && !next && !error && (
            <Text block={true} style={{ marginTop: 8 }}>{query ? formatText(strings.noImagesFound, query) : strings.noImages}</Text>
          )}
          {!loading && (images.length > 0 || visibleFolders.length > 0) && (
            <ul className={classNames.grid} style={{ listStyle: 'none', padding: 0 }} aria-label={strings.imagesInFolder}>
              {visibleFolders.map((f: IImageFolder) => (
                <li key={`folder:${f.name}`} className={classNames.tile} style={{ padding: 0 }}>
                  <button
                    type="button"
                    style={tileButtonStyle}
                    onClick={() => openFolder(subFolders.concat([f.name]))}
                    aria-label={formatText(strings.openFolderAria, f.name)}
                  >
                    <div
                      className={classNames.tileImage}
                      aria-hidden={true}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Icon iconName="FabricFolder" style={{ fontSize: 40 }} />
                    </div>
                    <span className={classNames.tileName} aria-hidden={true}>{f.name}</span>
                  </button>
                </li>
              ))}
              {images.map((img: IImageFile) => {
                const current = isSameImageUrl(img.serverRelativeUrl, currentUrl);
                return (
                  <li key={img.serverRelativeUrl} className={css(classNames.tile, current && classNames.tileSelected)} style={{ padding: 0 }}>
                    <button
                      type="button"
                      style={tileButtonStyle}
                      onClick={() => onSelect(img.serverRelativeUrl)}
                      aria-pressed={current}
                      aria-label={formatText(strings.selectImageAria, img.name, current)}
                    >
                      <div
                        className={classNames.tileImage}
                        aria-hidden={true}
                        style={{ backgroundImage: `url("${img.serverRelativeUrl.replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/'/g, '%27')}")` }}
                      />
                      <span className={classNames.tileName} aria-hidden={true}>{img.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {!loading && next && (
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              {loadingMore
                ? <Spinner size={SpinnerSize.medium} label={strings.loadingImages} ariaLive="polite" />
                : <DefaultButton iconProps={{ iconName: 'ChevronDown' }} text={strings.loadMore} onClick={loadMore} />}
            </div>
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
                  {formatText(strings.uploadRules, allowed, maxMb)} {formatText(strings.uploadTarget, service.resolveFolder(folder))}
                </Text>
              </div>
            )}
            <input
              ref={fileInput}
              type="file"
              accept={acceptAttribute(policy)}
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
            maxLength={policy.maxUrlLength}
            autoComplete="off"
            spellCheck={false}
            onChange={(e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, v?: string) => setUrlInput(v || '')}
            errorMessage={urlInput ? urlCheck.error : undefined}
            description={policy.imagesSameHostOnly ? strings.sameHostOnly : undefined}
          />
          {urlInput && urlCheck.suggestion && (
            <ActionButton iconProps={{ iconName: 'AutoEnhanceOn' }} text={formatText(strings.fixTo, urlCheck.suggestion)}
              onClick={() => setUrlInput(urlCheck.suggestion || '')} />
          )}
          <div style={{ marginTop: 12 }}>
            <PrimaryButton text={strings.apply} disabled={!urlCheck.valid} onClick={() => onSelect(urlCheck.url)} />
            <DefaultButton text={strings.cancel} style={{ marginLeft: 8 }} onClick={onDismiss} />
          </div>
        </PivotItem>
      </Pivot>
    </Panel>
  );
};
