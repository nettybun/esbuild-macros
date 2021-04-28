export const colours = {
  black: '#000',
  white: '#fff',
  gray: {
    _600: '#718096',
    _700: '#4a5568',
    _800: '#2d3748',
  },
  red: {
    _600: '#e53e3e',
    _700: '#c53030',
    _800: '#9b2c2c',
  },
  orange: {
    _600: '#dd6b20',
    _700: '#c05621',
    _800: '#9c4221',
  },
  yellow: {
    _600: '#d69e2e',
    _700: '#b7791f',
    _800: '#975a16',
  },
  green: {
    _600: '#38a169',
    _700: '#2f855a',
    _800: '#276749',
  },
  teal: {
    _600: '#319795',
    _700: '#2c7a7b',
    _800: '#285e61',
  },
  blue: {
    _600: '#3182ce',
    _700: '#2b6cb0',
    _800: '#2c5282',
  },
  indigo: {
    _600: '#5a67d8',
    _700: '#4c51bf',
    _800: '#434190',
  },
  purple: {
    _600: '#805ad5',
    _700: '#6b46c1',
    _800: '#553c9a',
  },
  pink: {
    _600: '#d53f8c',
    _700: '#b83280',
    _800: '#97266d',
  },
};
export const sizes = {
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
};
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
};
export const decl = {
  pageBackground: colours.purple._700,
  bodyBackground: '#eee',
  colour: colours,
  size: sizes,
  classes,
};

function interpolateTemplateString(quasis, expressions) {
  let string = '';
  for (let i = 0; i < expressions.length; i++) {
    const exp = expressions[i];
    if (typeof exp !== 'string') {
      throw new Error(`Template expression "\${${exp}}" must be a string`);
    }
    string += quasis[i];
    string += exp;
  }
  // There's always one more static string than variable
  string += quasis[quasis.length - 1];
  return string;
}

export function css(statics, ...templateVariables) {
  const string = interpolateTemplateString(statics, templateVariables);
  console.log('Passing to Stylis:', string);
  return '#HASH#';
}

export function injectGlobal(statics, ...templateVariables) {
  const string = interpolateTemplateString(statics, templateVariables);
  console.log('Prepending to stylesheet:', string);
  return '';
}
