// Macro Styles

// This macro is specifically built for esbuild which supports tsconfig/jsconfig
// path options. Therefore anyone, even JS-only users, should be able to use the
// bare package-like import {...} from 'styletakeout.macro' and have type
// correctly without errors. I need to double check non-TS though.

// I'll have to throw an error if someone _doesn't_ override via tsconfig and
// tell them that, unlike other macros, this one requires a local definition
// file since you'll be using your own imports.

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

// With `as const` the editor will display the value instead of "string".
// Alternatively, you can not use it and just press Ctrl while hovering. Then
// the editor will show the implementation preview. Unfortunately that means
// this can't be typed as `Colours`
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

export const classes = {
  text: {
    _0_xs: css`font-size: 0.75rem;`,
    _1_sm: css`font-size: 0.875rem;`,
    _2_md: css`font-size: 1rem;`,
    _3_lg: css`font-size: 1.125rem;`,
    _4_xl: css`font-size: 1.25rem;`,
    _5_xl: css`font-size: 1.5rem;`,
    _6_xl: css`font-size: 1.875rem;`,
    _7_xl: css`font-size: 2.25rem;`,
    _8_xl: css`font-size: 3rem;`,
    _9_xl: css`font-size: 4rem;`,
  },
} as const;

export const decl = {
  pageBackground: colours.purple._100,
  bodyBackground: '#eee',
  colour: colours,
  size: sizes,
  classes: classes,
} as const;

// This file will be run automatically by the macro, meaning css`` and
// injectGlobal`` are valid functions (the above fake "declare" functions are
// removed) so you can use them here!

injectGlobal`
  body {
    /* Styles */
  }
  /* Note that there's no reason to define classes here - put your classes in
     the "classes" export above and you'll get type checking */
`;
