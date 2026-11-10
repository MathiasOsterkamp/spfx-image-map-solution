import { IStrings } from './IStrings';
import { de } from './de';
import { en } from './en';
import { fr } from './fr';

export { IStrings };

/**
 * Texts of the current language. German is the default; English and French are selected
 * via the UI language of the SharePoint site (e.g. "en-US", "fr-FR").
 * The object is filled in place, so all modules always see the current language.
 */
export const strings: IStrings = {} as IStrings;

function apply(source: IStrings): void {
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      (strings as any)[key] = (source as any)[key];
    }
  }
}

/** Selects the language from a culture name such as "de-DE", "en-US" or "fr-CA". Unknown → German. */
export function setLanguage(cultureName: string | undefined): void {
  const language = (cultureName || '').toLowerCase().split('-')[0];
  apply(language === 'en' ? en : language === 'fr' ? fr : de);
}

/** Formats a number with one decimal place and the decimal separator of the current language. */
export function formatNumber(n: number, decimals: number = 1): string {
  const factor = Math.pow(10, decimals);
  return String(Math.round(n * factor) / factor).replace('.', strings.decimalSeparator);
}

apply(de);
