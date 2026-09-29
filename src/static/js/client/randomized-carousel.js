import {stitchArrays} from '../../shared-util/sugar.js';
import {prng} from '../../shared-util/prng.js';

import {cssProp} from '../client-util.js';

export const info = {
  id: 'randomizedCarouselInfo',

  carousels: null,
  carouselSeedSuffixes: null,
  carouselAnchorDates: null,
  carouselUpdateFrequencies: null,
  carouselGrids: null,

  carouselTiles: null,
  carouselTileAnchorDates: null,
  carouselTileUpdateFrequencies: null,

  // Sparse arrays. Map onto carouselTiles etc, above.
  randomizedCarouselTiles: null,
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

function stringifyDate(date) {
  return date.toISOString().slice(0, '2026-09-13'.length);
}

function getSeedOfTheWeek(dayOfTheWeek) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const sunday = new Date(today);
  sunday.setUTCDate(today.getUTCDate() - today.getUTCDay());

  return stringifyDate(sunday);
}

function getRotatingSeed(anchorDate, updateFrequency) {
  switch (updateFrequency) {
    case 'daily':
      return stringifyDate(new Date);

    case 'weekly':
      return getSeedOfTheWeek(anchorDate.getUTCDay());

    default:
      return stringifyDate(anchorDate);
  }
}

function getInitialSeed(carouselIndex, tileIndex) {
  const {session} = info;

  const anchorDate =
    info.carouselTileAnchorDates[carouselIndex][tileIndex] ??
    info.carouselAnchorDates[carouselIndex];

  const updateFrequency =
    info.carouselTileUpdateFrequencies[carouselIndex][tileIndex] ??
    info.carouselUpdateFrequencies[carouselIndex];

  const basicSeed =
    (session.randomizeWithSeed === 'random'
      ? Math.floor(Math.random() * 100000).toString()
   : session.randomizeWithSeed === ''
      ? getRotatingSeed(anchorDate, updateFrequency)
      : session.randomizeWithSeed);

  const seedSuffix = info.carouselSeedSuffixes[carouselIndex];

  if (seedSuffix) {
    return basicSeed + '-' + seedSuffix;
  } else {
    return basicSeed;
  }
}

export function getPageReferences() {
  const adjustDateIfYouInsistProbablyNotNecessaryButUnsure = date => {
    date.setUTCHours(0, 0, 0, 0);
    return date;
  };

  info.carousels =
    Array.from(document.querySelectorAll('.carousel-container'));

  info.carouselSeedSuffixes =
    info.carousels
      .map(carousel => carousel.dataset.carouselSeedSuffix ?? null);

  info.carouselAnchorDates =
    info.carousels
      .map(carousel => new Date(carousel.dataset.anchorDate))
      .map(date => adjustDateIfYouInsistProbablyNotNecessaryButUnsure(date));

  info.carouselUpdateFrequencies =
    info.carousels
      .map(carousel => carousel.dataset.updateFrequency);

  info.carouselGrids =
    info.carousels
      .map(carousel => carousel.querySelector('.carousel-grid'));

  // It's about to get fun here
  const keep = f => v => f(v) ? v : null;
  const iffy = f => v => v ? f(v) : v;

  info.carouselTiles =
    info.carouselGrids
      .map(grid => grid.querySelectorAll(':scope > .carousel-tile'))
      .map(tiles => Array.from(tiles));

  info.carouselTileAnchorDates =
    info.carouselTiles
      .map(tiles => tiles
        .map(tile => tile.dataset.anchorDate ?? null)
        .map(iffy(date => new Date(date)))
        .map(iffy(adjustDateIfYouInsistProbablyNotNecessaryButUnsure)));

  info.carouselTileUpdateFrequencies =
    info.carouselTiles
      .map(tiles => tiles
        .map(tile => tile.dataset.updateFrequency ?? null));

  info.randomizedCarouselTiles =
    info.carouselTiles
      .map(tiles => tiles
        .map(keep(tile => tile.matches('.carousel-randomized-tile'))));

  info.randomizedCarouselTileOptionTiles =
    info.randomizedCarouselTiles
      .map(tiles => tiles
        .map(iffy(tile => tile.querySelectorAll('.carousel-tile')))
        .map(iffy(optionTiles => Array.from(optionTiles))));
}

export function mutatePageContent() {
  info.randomizedCarouselTileOptionTiles.forEach((lists, carouselIndex) => {
    const carouselPool = Object.create(null);
    const splishSplashPRNG = seed => {
      if (seed in carouselPool) {
        return carouselPool[seed];
      } else {
        const next = prng(seed);
        carouselPool[seed] = next;
        return next;
      }
    };

    lists.forEach((optionTiles, tileIndex) => {
      if (!optionTiles) return;

      const seed = getInitialSeed(carouselIndex, tileIndex);
      const next = splishSplashPRNG(seed);

      const choice = Math.floor(optionTiles.length * next());
      const tile = optionTiles[choice];

      tile.classList.add('show');
    });
  });
}
