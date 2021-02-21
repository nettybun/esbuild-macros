// This is an example but honestly go use the 'ms' package which is exactly what
// the 'ms.macro' Babel macro does

const s = 1000;
const m = s * 60;
const h = m * 60;
const d = h * 24;
const w = d * 7;
const y = d * 365.25;
const conv = { s, m, h, d, w, y };

export function ms(time) {
  const match = time.match(/^(\d+)\s*(\w+)$/);
  if (!match) {
    throw new Error(`ms.macro: "${time}" isn't a valid time format`);
  }
  const [, amount, unit] = match;
  // eslint-disable-next-line prefer-destructuring
  const letter = unit.toLowerCase()[0];
  return Number(amount) * conv[letter];
}
