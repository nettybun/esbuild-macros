// Macro Styles

/** Takeout css`` statement is replaced with a string of a unique classname */
export declare function css(statics: TemplateStringsArray, ...variables: string[]): string;
/** Takeout injectGlobal`` statement is removed entirely */
export declare function injectGlobal(statics: TemplateStringsArray, ...variables: string[]): void;

export type ColourNames = 'gray'|'red'|'orange'|'yellow'|'green'|'teal'|'blue'|'indigo'|'purple'|'pink';
export type Levels = '_100'|'_200'|'_300'|'_400'|'_500'|'_600'|'_700'|'_800'|'_900';
// ^ Numbers can't be property names so they're prefixed with '_'
export type Colours =
  & { black: string, white: string }
  & { [colours in ColourNames]: { [level in Levels]: string } };

// Having `as const` let's the editor display the value instead of "string"
// Unfortunately that means this can't be typed as `Colours`
export const colours = {
  black: '#000',
  white: '#fff',
  gray: {
    _100: '#f7fafc',
    _200: '#edf2f7',
    _300: '#e2e8f0',
    _400: '#cbd5e0',
    _500: '#a0aec0',
    _600: '#718096',
    _700: '#4a5568',
    _800: '#2d3748',
    _900: '#1a202c',
  } as const,
  red: {
    _100: '#fff5f5',
    _200: '#fed7d7',
    _300: '#feb2b2',
    _400: '#fc8181',
    _500: '#f56565',
    _600: '#e53e3e',
    _700: '#c53030',
    _800: '#9b2c2c',
    _900: '#742a2a',
  } as const,
  orange: {
    _100: '#fffaf0',
    _200: '#feebc8',
    _300: '#fbd38d',
    _400: '#f6ad55',
    _500: '#ed8936',
    _600: '#dd6b20',
    _700: '#c05621',
    _800: '#9c4221',
    _900: '#7b341e',
  } as const,
  yellow: {
    _100: '#fffff0',
    _200: '#fefcbf',
    _300: '#faf089',
    _400: '#f6e05e',
    _500: '#ecc94b',
    _600: '#d69e2e',
    _700: '#b7791f',
    _800: '#975a16',
    _900: '#744210',
  } as const,
  green: {
    _100: '#f0fff4',
    _200: '#c6f6d5',
    _300: '#9ae6b4',
    _400: '#68d391',
    _500: '#48bb78',
    _600: '#38a169',
    _700: '#2f855a',
    _800: '#276749',
    _900: '#22543d',
  } as const,
  teal: {
    _100: '#e6fffa',
    _200: '#b2f5ea',
    _300: '#81e6d9',
    _400: '#4fd1c5',
    _500: '#38b2ac',
    _600: '#319795',
    _700: '#2c7a7b',
    _800: '#285e61',
    _900: '#234e52',
  } as const,
  blue: {
    _100: '#ebf8ff',
    _200: '#bee3f8',
    _300: '#90cdf4',
    _400: '#63b3ed',
    _500: '#4299e1',
    _600: '#3182ce',
    _700: '#2b6cb0',
    _800: '#2c5282',
    _900: '#2a4365',
  } as const,
  indigo: {
    _100: '#ebf4ff',
    _200: '#c3dafe',
    _300: '#a3bffa',
    _400: '#7f9cf5',
    _500: '#667eea',
    _600: '#5a67d8',
    _700: '#4c51bf',
    _800: '#434190',
    _900: '#3c366b',
  } as const,
  purple: {
    _100: '#faf5ff',
    _200: '#e9d8fd',
    _300: '#d6bcfa',
    _400: '#b794f4',
    _500: '#9f7aea',
    _600: '#805ad5',
    _700: '#6b46c1',
    _800: '#553c9a',
    _900: '#44337a',
  } as const,
  pink: {
    _100: '#fff5f7',
    _200: '#fed7e2',
    _300: '#fbb6ce',
    _400: '#f687b3',
    _500: '#ed64a6',
    _600: '#d53f8c',
    _700: '#b83280',
    _800: '#97266d',
    _900: '#702459',
  } as const,
} as const;

export const sizes = {
  // Without the leading 0 autocomplete will order them wrong
  _00: '0',
  _01: '0.25rem',
  _02: '0.5rem',
  _03: '0.75rem',
  _04: '1rem',
  _05: '1.25rem',
  _06: '1.5rem',
  _08: '2rem',
  _10: '2.5rem',
  _12: '3rem',
  _16: '4rem',
  _20: '5rem',
  _24: '6rem',
  _32: '8rem',
  _40: '10rem',
  _48: '12rem',
  _56: '14rem',
  _64: '16rem',
} as const;

export const snippets = {
  text: {
    xs:   'font-size: 0.75rem;',
    sm:   'font-size: 0.875rem;',
    md:   'font-size: 1rem;',
    lg:   'font-size: 1.125rem;',
    xl:   'font-size: 1.25rem;',
    xl_2: 'font-size: 1.5rem;',
    xl_3: 'font-size: 1.875rem;',
    xl_4: 'font-size: 2.25rem;',
    xl_5: 'font-size: 3rem;',
    xl_6: 'font-size: 4rem;',
  },
} as const;

export const decl = {
  pageBackground: colours.purple._100,
  bodyBackground: '#eee',
  colour: colours,
  size: sizes,
  snippet: snippets,
} as const;

// TODO: Is there a way to autorun an injectGlobal here when Node loads this
// file? This is looking like it'll replace .babelrc.json as a config file, so
// having a way to inject _and_ define (in TS) global classes could replace the
// need for inlined snippets
