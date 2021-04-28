import { decl, colours, css, classes } from 'styletakeout.macro';
import { otherStyles } from './example-imported.js';

/* eslint-disable @typescript-eslint/no-unused-vars */

const exportedVariable = colours.blue._800;
const styles = css`
  padding: 15px;
  background-color: ${colours.blue._700};
  margin-top: ${decl.size._05};
  margin-left: ${decl.size._04};
  margin-right: ${decl.size._03};
`;

console.log(styles);
console.log(decl.pageBackground);
console.log(otherStyles);

`m5 p5 ${css`vertical-align: middle`} align-center ${styles} ${classes.text._0_xs}`;
`m5 p5 ${css`vertical-align: middle`} align-center`;
`m5 p5 ${styles} ${css`vertical-align: middle`} align-center ${styles}`;
`${styles} ${css`vertical-align: middle`}`;
`${css`vertical-align: middle`}`;
`${css`vertical-align: middle`} hello`;
