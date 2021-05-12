/** @typedef {{ start: number, end: number, str?: string }} Range */
/** @type {Array<Range>} */
const rangeList = [];

/** @type {(range: Range) => void} */
const insertRange = (ins) => {
  if (ins.start > ins.end) {
    throw new Error('Range ins start > end');
  }
  for (let i = 0; i < rangeList.length; i++) {
    console.log(`Index ${i}/${rangeList.length - 1}`);
    const curr = rangeList[i];
    // Entirely _before_ curr.
    if (ins.end < curr.start) {
      console.log('Range ins is before curr, inserting; ins,curr', ins, curr);
      rangeList.splice(i, 0, ins);
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
      rangeList.splice(i, 1);
      i--;
      continue; // Next.
    }
    // Covered entire ins by curr
    if (ins.start >= curr.start && ins.end <= curr.end) {
      console.log('Unexpected ins smaller than curr; ins,curr', ins, curr);
      throw new Error('Range ins smaller than curr');
    }
    throw new Error('Unreachable');
  }
};

/** @param {number} start; @param {number} end */
const queryRangesBetween = (start, end) => {
  if (start > end) {
    throw new Error('Query start > end');
  }
  const matchingRanges = [];
  for (let i = 0; i < rangeList.length; i++) {
    const curr = rangeList[i];
    // Entirely before
    if (curr.end < start) continue;
    // Entirely after. We're passed the range. Done.
    if (curr.start > end) break;
    // Half in on the left
    if (curr.start < start && curr.end > start) throw new Error('Half in left');
    // Half in on the right
    if (curr.start < end && curr.end > end) throw new Error('Half in right');
    // OK
    if (curr.start >= start && curr.end <= end) matchingRanges.push(curr);
    throw new Error('Unreachable');
  }
  return matchingRanges;
};

export { rangeList, insertRange, queryRangesBetween };
