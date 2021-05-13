/** @typedef {{ start: number, end: number, str?: string }} Range */
/** @type {Array<Range>} */
const rangeList = [];

/** @param {Range} range */
const p = (range) => `[${range.start},${range.end}]`;

/** @type {(range: Range) => void} */
const insertRange = (ins) => {
  if (ins.start > ins.end) throw new Error('Range ins start > end');
  // Stored in reverse order so .forEach(splice()) doesn't mess up indices
  const removeIndices = [];
  for (let i = 0; i < rangeList.length; i++) {
    const curr = rangeList[i];
    // Covering entire curr by ins
    if (ins.start <= curr.start && ins.end >= curr.end) {
      console.log(`Upcoming insert of ${p(ins)} will cover/replace ${p(curr)}`);
      removeIndices.unshift(i);
      continue;
    }
    // Covered entire ins by curr
    if (ins.start >= curr.start && ins.end <= curr.end) {
      throw new Error(`Range ${p(ins)} would be covered by ${p(curr)}`);
    }
    let ib, ia;
    // Entirely before curr
    if ((ib = ins.end < curr.start)) {
      console.log(`${p(ins)} < ${p(curr)}; inserting`);
      rangeList.splice(i, 0, ins);
      removeIndices.forEach(ri => {
        console.log(`Removing ${p(rangeList[ri])}`);
        rangeList.splice(ri, 1);
      });
      return;
    }
    // Entirely after curr
    if ((ia = ins.start > curr.end)) {
      console.log(`${p(ins)} > ${p(curr)}; next`);
      continue;
    }
    // Overlapping before (ib) or after (ia) curr
    if (!ib || !ia) {
      throw new Error(`Partial overlap of ${p(ins)} with ${p(curr)}`);
    }
    throw new Error('Unreachable');
  }
  rangeList.push(ins);
};

/** @param {number} start; @param {number} end */
const queryRangesBetween = (start, end) => {
  if (start > end) throw new Error('Query start > end');
  const matchingRanges = [];
  for (let i = 0; i < rangeList.length; i++) {
    const curr = rangeList[i];
    // OK
    if (curr.start >= start && curr.end <= end) {
      matchingRanges.push(curr);
      continue;
    }
    let cb, ca;
    // Entirely before
    if ((cb = curr.end < start)) continue;
    // Entirely after. We're passed the range. Exit.
    if ((ca = curr.start > end)) break;
    if (!cb) throw new Error(`Overlap into ${i}`);
    if (!ca) throw new Error(`Overlap out from ${i}`);
    throw new Error('Unreachable');
  }
  return matchingRanges;
};

export { rangeList, insertRange, queryRangesBetween };
