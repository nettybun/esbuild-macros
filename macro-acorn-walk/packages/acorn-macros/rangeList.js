/** @typedef {{ start: number, end: number, str?: string }} Range */
/** @type {Array<Range>} */
const ranges = [];

/** @type {(range: Range) => void} */
const insertRange = (ins) => {
  for (let i = 0; i < ranges.length; i++) {
    console.log(`Index ${i}/${ranges.length - 1}`);
    const curr = ranges[i];
    if (ins.start < curr.start) {
      if (ins.end < curr.start) {
        console.log('Range ins is before curr, inserting; ins,curr', ins, curr);
        ranges.splice(i, 0, ins);
        return;
      } else { // ins.end >= curr.start
        if (ins.end < curr.end) {
          console.log('Unexpected partial overlap; ins,curr:', ins, curr);
          throw new Error('Overlap ins before curr');
        } else { // ins.end >= curr.end
          console.log('Range ins is bigger than curr, removing curr; ins,curr', ins, curr);
          ranges.splice(i, 1);
        }
      }
    } else { // ins.start >= curr.start
      if (curr.end < ins.start) {
        console.log('Range ins is after curr, nexting; ins,curr', ins, curr);
      } else { // curr.end >= ins.start
        if (curr.end < ins.end) {
          console.log('Unexpected partial overlap; ins,curr:', ins, curr);
          throw new Error('Overlap curr before ins');
        } else { // curr.end >= ins.end
          console.log('Unexpected ins smaller than curr; ins,curr', ins, curr);
          throw new Error('Range ins smaller than curr');
        }
      }
    }
  }
};

export { ranges, insertRange };
