export const decl = {
  colours: {
    blue: 'palebluemoon',
  },
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
