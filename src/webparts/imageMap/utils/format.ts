import { strings } from '../loc/strings';

/** Formats a number with the given decimal places and the decimal separator of the current language. */
export function formatNumber(n: number, decimals: number = 1): string {
  const factor = Math.pow(10, decimals);
  return String(Math.round(n * factor) / factor).replace('.', strings.decimalSeparator);
}
