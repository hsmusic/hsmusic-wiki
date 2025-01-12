import {isObject} from '#validators';

import {inputSoupyReverse} from '#composite/wiki-data';

function soupyReverse() {
  return {
    flags: {update: true},
    update: {validate: isObject},
  };
}

soupyReverse.input = inputSoupyReverse.input;

soupyReverse.contributionsBy =
  (bindTo, contributionsProperty) => ({
    bindTo,

    referencing: thing => thing[contributionsProperty],
    referenced: contrib => [contrib.artist],
  });

export default soupyReverse;
