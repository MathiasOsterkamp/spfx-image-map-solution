/**
 * Formats a text template of the language files.
 *
 * The SPFx build writes the language files as plain data (JSON), so they cannot contain
 * functions. Texts with parameters are therefore templates:
 *
 *   {0}             value of the first parameter
 *   {0:lower}       the same in lower case
 *   {1?yes|no}      "yes" if the second parameter is set/true, otherwise "no" ("|no" is optional)
 *   {0#one|many}    "one" if the first parameter is a singular count, otherwise "many"
 *
 * The alternatives may contain placeholders themselves, e.g. "{0#one area|{0} areas}".
 *
 * @param zeroIsSingular Plural rule of the language: true = 0 and 1 are singular (French), false = only 1
 */
export function formatTemplate(template: string, args: unknown[], zeroIsSingular: boolean): string {
  let pos = 0;

  const text = (value: unknown): string => (value === undefined || value === null ? '' : String(value));

  const isSingular = (value: unknown): boolean =>
    zeroIsSingular ? typeof value === 'number' && value <= 1 : value === 1;

  /** Reads up to the end of the current alternative ("|" or "}") or of the template. */
  const readText = (inAlternative: boolean): string => {
    let out = '';
    while (pos < template.length) {
      const c = template.charAt(pos);
      if (c === '}' || (inAlternative && c === '|')) { break; }
      pos++;
      out += c === '{' ? readPlaceholder() : c;
    }
    return out;
  };

  /** Reads a placeholder; pos is behind the opening brace. */
  const readPlaceholder = (): string => {
    let digits = '';
    while (/[0-9]/.test(template.charAt(pos))) { digits += template.charAt(pos++); }
    const value = args[parseInt(digits, 10)];
    const operator = template.charAt(pos++);
    if (operator === '}') {
      return text(value);
    }
    if (operator === ':') {
      const end = template.indexOf('}', pos);
      const modifier = template.substring(pos, end);
      pos = end + 1;
      return modifier === 'lower' ? text(value).toLowerCase() : text(value);
    }
    const first = readText(true);
    let second = '';
    if (template.charAt(pos) === '|') {
      pos++;
      second = readText(true);
    }
    pos++; // closing brace
    return (operator === '#' ? isSingular(value) : !!value) ? first : second;
  };

  return readText(false);
}
