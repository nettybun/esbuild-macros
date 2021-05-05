/* eslint-disable */

// macros/styletakeout.macro/example.ts
import{decl as l,colours as i,css as e,classes as a}from"styletakeout.macro";
// macros/styletakeout.macro/example-imported.ts
import{decl as s,sizes as r,css as c}from"styletakeout.macro";
var p = r._04,
t = c`
  padding: ${s.size._05};
`;
// macros/styletakeout.macro/example.ts
var u = i.blue._800,
o = e`
  padding: 15px;
  background-color: ${i.blue._700};
  margin-top: ${l.size._05};
  margin-left: ${l.size._04};
  margin-right: ${l.size._03};
`;
function d(n){return n+10}
console.log(d(10));
console.log(o);
console.log(l.pageBackground);
console.log(t);
var _ = `m5 p5 ${e`vertical-align: middle`} align-center ${o} ${a.text._0_xs}`,
x = `m5 p5 ${e`vertical-align: middle`} align-center`,
b = `m5 p5 ${o} ${e`vertical-align: middle`} align-center ${o}`,
f = `${o} ${e`vertical-align: middle`}`,
h = `${e`vertical-align: middle`}`,
y = `${e`vertical-align: middle`} hello`;
