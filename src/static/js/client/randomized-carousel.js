import {stitchArrays} from '../../shared-util/sugar.js';
import {prng} from '../../shared-util/prng.js';

import {cssProp} from '../client-util.js';

export const info = {
  id: 'randomizedCarouselInfo',

  seedOfTheWeek: null,

  carousels: null,
  carouselSeedSuffixes: null,

  randomizedCarouselTileIndexes: null,
  randomizedCarouselTileLengths: null,

  // Each conceptual tile is represented by three actual elements, since that's
  // how the carousel looping effect is coded. So the "leaf" element here is
  // a list of options, each option of which is three tiles. Then there are
  // multiple lists of options per carousel.
  randomizedCarouselTileTileTiles: null,

  session: {
    // Blank string means use the default, 'random' means use a new seed
    // on each page load, any other string is a seed to use and reuse.
    randomizeWithSeed: {
      type: 'string',
      default: '',
      clearOnHomepage: false,
    },
  },
};

function getSeedOfTheWeek() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const sunday = new Date(today);
  sunday.setUTCDate(today.getUTCDate() - today.getUTCDay());

  return sunday.toISOString().slice(0, '2026-09-13'.length);
}

function getInitialSeed(carouselIndex) {
  const {session} = info;

  const basicSeed =
    (session.randomizeWithSeed === 'random'
      ? Math.floor(Math.random() * 100000).toString()
   : session.randomizeWithSeed === ''
      ? getSeedOfTheWeek()
      : session.randomizeWithSeed);

  const seedSuffix = info.carouselSeedSuffixes[carouselIndex];

  if (seedSuffix) {
    return basicSeed + '-' + seedSuffix;
  } else {
    return basicSeed;
  }
}

export function initializeState() {
  info.seedOfTheWeek = getSeedOfTheWeek();
}

export function getPageReferences() {
  info.carousels =
    Array.from(document.querySelectorAll('.carousel-container'));

  info.carouselSeedSuffixes =
    info.carousels
      .map(carousel => carousel.dataset.carouselSeedSuffix ?? null);

  info.randomizedCarouselTileIndexes =
    info.carousels
      .map(carousel => carousel.querySelector('.carousel-grid'))
      .map(grid => Array.from(grid.querySelectorAll('.carousel-randomized-tile')))
      .map(tiles => tiles
        .map(tile => Array.from(tile.parentElement.children).indexOf(tile)));

  info.randomizedCarouselTileLengths =
    info.carousels
      .map(carousel => carousel.querySelector('.carousel-grid'))
      .map(grid => Array.from(grid.querySelectorAll('.carousel-randomized-tile')))
      .map(tiles => tiles
        .map(tile => tile.querySelectorAll('.carousel-tile').length));

  info.randomizedCarouselTileTileTiles =
    stitchArrays({
      indexes: info.randomizedCarouselTileIndexes,
      lengths: info.randomizedCarouselTileLengths,
      carousel: info.carousels,
    }).map(({indexes, lengths, carousel}) =>
        stitchArrays({
          randomizerIndex: indexes,
          randomizerLength: lengths,
        }).map(({randomizerIndex, randomizerLength}) =>
            Array.from({length: randomizerLength}, (_, optionIndex) =>
              Array.from({length: 3}, (_, gridIndex) =>
                carousel.querySelector(
                  `.carousel-grid:nth-child(${gridIndex + 1})` +
                  ` > :nth-child(${randomizerIndex + 1})` +
                  ` > :nth-child(${optionIndex + 1})`)))));
}

export function mutatePageContent() {
  info.randomizedCarouselTileTileTiles.forEach((tileTileTiles, carouselIndex) => {
    const seed = getInitialSeed(carouselIndex);
    const next = prng(seed);

    tileTileTiles.forEach(optionTileLists => {
      const choice = Math.floor(optionTileLists.length * next());

      optionTileLists.forEach((optionTiles, index) => {
        for (const tile of optionTiles) {
          if (index === choice) {
            cssProp(tile, 'display', null);
          } else {
            cssProp(tile, 'display', 'none');
          }
        }
      });
    });
  });
}
