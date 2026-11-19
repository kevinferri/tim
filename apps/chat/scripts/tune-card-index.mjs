// Sets the corner index of the RevK "Large index" faces in public/assets/cards to midway between the
// generator's Medium and Large sizes (it offers no size in between). Pips and court art keep the Large
// layout, which leaves room for the bigger corner. Safe to rerun: edited files are marked and skipped.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIR = new URL("../public/assets/cards/", import.meta.url).pathname;
const MARK = 'data-index="between"';
// [Large, in between]: the averages of the generator's Medium and Large placements.
const SWAPS = [
  [
    'height="70" width="70" x="-122" y="-156"',
    'height="60" width="60" x="-120" y="-156"',
  ],
  [
    'height="58.558" width="58.558" x="-116.279" y="-81"',
    'height="50.193" width="50.193" x="-115.096" y="-91"',
  ],
];

let edited = 0;
for (const name of readdirSync(DIR).filter((f) => f.endsWith(".svg"))) {
  const path = join(DIR, name);
  let svg = readFileSync(path, "utf8");
  if (svg.includes(MARK)) continue;
  for (const [from, to] of SWAPS) {
    if (!svg.includes(from)) throw new Error(`${name}: not a Large-index face`);
    svg = svg.replaceAll(from, to);
  }
  svg = svg.replace(/^(<svg\b)/m, `$1 ${MARK}`);
  writeFileSync(path, svg);
  edited++;
}
console.log(`edited ${edited} card faces`);
