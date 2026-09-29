import {stitchArrays} from '../../shared-util/sugar.js';
import {prng} from '../../shared-util/prng.js';

import {cssProp} from '../client-util.js';

export const info = {
  id: 'randomizedCarouselInfo',

  seedOfTheWeek: null,

  carousels: null,
  carouselSeedSuffixes: null,
  carouselGrids: null,

  randomizedCarouselTileOptionTiles: null,

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

  info.carouselGrids =
    info.carousels
      .map(carousel => carousel.querySelector('.carousel-grid'));

  info.randomizedCarouselTileOptionTiles =
    info.carouselGrids
      .map(grid => Array.from(grid.querySelectorAll('.carousel-randomized-tile')))
      .map(tiles => tiles
        .map(tile => Array.from(tile.querySelectorAll('.carousel-tile'))));
}

export function mutatePageContent() {
  info.randomizedCarouselTileOptionTiles.forEach((lists, carouselIndex) => {
    const seed = getInitialSeed(carouselIndex);
    const next = prng(seed);

    lists.forEach(optionTiles => {
      const choice = Math.floor(optionTiles.length * next());
      const tile = optionTiles[choice];
      tile.classList.add('show');
    });
  });
}
