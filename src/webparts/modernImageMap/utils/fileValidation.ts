import { formatNumber } from './format';
import { ImageType, ISecurityPolicy } from '../config/securityConfig';
import { formatText } from '../loc/template';
import * as strings from 'ModernImageMapWebPartStrings';

const TYPE_LABEL: { [key: string]: string } = { png: 'PNG', jpeg: 'JPEG', gif: 'GIF', webp: 'WebP' };
const TYPE_EXTENSION: { [key: string]: string } = { png: 'png', jpeg: 'jpg', gif: 'gif', webp: 'webp' };

export interface IValidatedImage {
  type: ImageType;
  /** Sanitized file name with an extension matching the content */
  fileName: string;
}

/** Detects the image format from the file signature ("magic bytes"). */
export function detectImageType(b: Uint8Array): ImageType | undefined {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) { return 'png'; }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) { return 'jpeg'; }
  if (b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 &&
    (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61) { return 'gif'; }
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) { return 'webp'; }
  return undefined;
}

export function describeAllowedTypes(policy: ISecurityPolicy): string {
  return policy.allowedUploadTypes.map((t: ImageType) => TYPE_LABEL[t]).join(', ');
}

export function acceptAttribute(policy: ISecurityPolicy): string {
  return policy.allowedUploadTypes
    .map((t: ImageType) => (t === 'jpeg' ? '.jpg,.jpeg,image/jpeg' : `.${t},image/${t}`))
    .join(',');
}

export function sanitizeFileName(name: string, extension: string): string {
  const dot = (name || '').lastIndexOf('.');
  let base = dot > 0 ? name.substr(0, dot) : (name || '');
  base = base
    // eslint-disable-next-line no-control-regex -- control characters are removed on purpose
    .replace(/[\u0000-\u001f~"#%&*:<>?/\\{|}]/g, '_')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s_]+|[.\s]+$/g, '')
    .substr(0, 100);
  return `${base || strings.defaultFileName}.${extension}`;
}

function readHeader(file: File, length: number): Promise<Uint8Array> {
  return new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(new Error(strings.fileReadFailed));
    reader.readAsArrayBuffer(file.slice(0, length));
  });
}

/**
 * Checks the size and actual content of the file. The browser's MIME type is NOT trusted,
 * since it is only derived from the file extension.
 */
export function validateImageFile(file: File, policy: ISecurityPolicy): Promise<IValidatedImage> {
  if (!file) {
    return Promise.reject(new Error(strings.noFileSelected));
  }
  if (file.size === 0) {
    return Promise.reject(new Error(strings.fileEmpty));
  }
  if (file.size > policy.maxUploadBytes) {
    const mb = (n: number) => formatNumber(n / 1024 / 1024);
    return Promise.reject(new Error(formatText(strings.fileTooLarge, mb(file.size), mb(policy.maxUploadBytes))));
  }
  return readHeader(file, 16).then((header: Uint8Array) => {
    const type = detectImageType(header);
    if (!type || policy.allowedUploadTypes.indexOf(type) < 0) {
      throw new Error(formatText(strings.invalidImageContent, describeAllowedTypes(policy)));
    }
    return { type, fileName: sanitizeFileName(file.name, TYPE_EXTENSION[type]) };
  });
}
