import { decl, sizes, colours, css, classes } from 'styletakeout.macro';
import { otherStyles } from './example-imported.js';

/* eslint-disable @typescript-eslint/no-unused-vars */

const exportedVariable = colours.black;
const styles = css`
  padding: 15px;
  background-color: ${colours.black};
  margin-top: ${sizes._05};
  margin-left: ${sizes._04};
  margin-right: ${sizes._03};
`;

// TODO: Ask Evan if this is safe for their upcoming lexer rewrite
function shadow(css: number) {
  return css + 10;
}

console.log(shadow(10));
console.log(styles);
console.log(decl.pageBackground);
console.log(otherStyles);

// These need to be assigned to a variable else --minify-sytax literally removes
// the string contents (!) since they're unused.
const v1 = `m5 p5 ${css`vertical-align: middle`} align-center ${styles} ${classes.text._0_xs}`;
const v2 = `m5 p5 ${css`vertical-align: middle`} align-center`;
const v3 = `m5 p5 ${styles} ${css`vertical-align: middle`} align-center ${styles}`;
const v4 = `${styles} ${css`vertical-align: middle`}`;
const v5 = `${css`vertical-align: middle`}`;
const v6 = `${css`vertical-align: middle`} hello`;
