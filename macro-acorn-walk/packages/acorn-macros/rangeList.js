/** @typedef {{ start: number, end: number, str?: string }} Range */
/** @type {Array<Range>} */
const ranges = [];

/** @type {(range: Range) => void} */
const insertRange = (ins) => {
  if (ins.start > ins.end) {
    throw new Error('Range start > end');
  }
  for (let i = 0; i < ranges.length; i++) {
    console.log(`Index ${i}/${ranges.length - 1}`);
    const curr = ranges[i];
    // Entirely _before_ curr.
    if (ins.end < curr.start) {
      console.log('Range ins is before curr, inserting; ins,curr', ins, curr);
      ranges.splice(i, 0, ins);
      return;
    }
    // Entirely _after_ curr
    if (ins.start > curr.end) {
      console.log('Range ins is after curr, nexting; ins,curr', ins, curr);
      continue; // Next.
    }
    // Overlapping ins into the left of curr
    if (ins.start < curr.start && ins.end >= curr.start) {
      console.log('Unexpected partial overlap; ins,curr:', ins, curr);
      throw new Error('Overlap');
    }
    // Overlapping ins into the right of curr
    if (ins.start >= curr.start && ins.end >= curr.end) {
      console.log('Unexpected partial overlap; ins,curr:', ins, curr);
      throw new Error('Overlap');
    }
    // Covering entire curr by ins
    if (ins.start <= curr.start && ins.end >= curr.end) {
      console.log('Range ins is bigger than curr, removing curr; ins,curr', ins, curr);
      ranges.splice(i, 1);
      continue; // Next.
    }
    // Covered entire ins by curr
    if (ins.start >= curr.start && ins.end <= curr.end) {
      console.log('Unexpected ins smaller than curr; ins,curr', ins, curr);
      throw new Error('Range ins smaller than curr');
    }
  }
};

export { ranges, insertRange };
