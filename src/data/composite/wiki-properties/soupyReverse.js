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

soupyReverse.artworkContributionsBy =
  (bindTo, artworkProperty) => ({
    bindTo,

    referencing: thing =>
      thing[artworkProperty]
        .flatMap(artwork => artwork.artistContribs),

    referenced: contrib => [contrib.artist],
  });

export default soupyReverse;
