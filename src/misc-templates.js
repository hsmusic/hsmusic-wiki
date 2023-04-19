// Miscellaneous utility functions which are useful across page specifications.
// These are made available right on a page spec's ({wikiData, language, ...})
// args object!

import T from './data/things/index.js';

import {
  empty,
  repeat,
  unique,
} from './util/sugar.js';

import {thumb} from './util/urls.js';

import {
  getTotalDuration,
  sortAlbumsTracksChronologically,
  sortChronologically,
} from './util/wiki-data.js';

// Grids

function unbound_getGridHTML({
  img,
  html,
  language,

  getRevealStringFromArtTags,

  entries,
  srcFn,
  linkFn,
  noSrcTextFn = () => '',
  altFn = () => '',
  detailsFn = null,
  lazy = true,
}) {
  return entries
    .map(({large, item}, i) =>
      linkFn(item, {
        class: ['grid-item', 'box', large && 'large-grid-item'],
        text: html.fragment([
          img({
            src: srcFn(item),
            alt: altFn(item),
            thumb: 'medium',
            lazy: typeof lazy === 'number' ? i >= lazy : lazy,
            square: true,
            reveal: getRevealStringFromArtTags(item.artTags, {language}),
            noSrcText: noSrcTextFn(item),
          }),
          html.tag('span', item.name),
          detailsFn &&
            html.tag('span', detailsFn(item)),
        ]),
      }))
    .join('\n');
}

function unbound_getAlbumGridHTML({
  getAlbumCover,
  getGridHTML,
  link,
  language,
  details = false,
  ...props
}) {
  return getGridHTML({
    srcFn: getAlbumCover,
    linkFn: link.album,
    detailsFn:
      details &&
      ((album) =>
        language.$('misc.albumGrid.details', {
          tracks: language.countTracks(album.tracks.length, {unit: true}),
          time: language.formatDuration(getTotalDuration(album.tracks)),
        })),
    noSrcTextFn: (album) =>
      language.$('misc.albumGrid.noCoverArt', {
        album: album.name,
      }),
    ...props,
  });
}

function unbound_getFlashGridHTML({
  link,

  getFlashCover,
  getGridHTML,
  ...props
}) {
  return getGridHTML({
    srcFn: getFlashCover,
    linkFn: link.flash,
    ...props,
  });
}

// Carousel reels

// Layout constants:
//
// Carousels support fitting 4-18 items, with a few "dead" zones to watch out
// for, namely when a multiple of 6, 5, or 4 columns would drop the last tiles.
//
// Carousels are limited to 1-3 rows and 4-6 columns.
// Lower edge case: 1-3 items are treated as 4 items (with blank space).
// Upper edge case: all items past 18 are dropped (treated as 18 items).
//
// This is all done through JS instead of CSS because it's just... ANNOYING...
// to write a mapping like this in CSS lol.
const carouselLayoutMap = [
  // 0-3
  null, null, null, null,

  // 4-6
  {rows: 1, columns: 4}, //  4: 1x4, drop 0
  {rows: 1, columns: 5}, //  5: 1x5, drop 0
  {rows: 1, columns: 6}, //  6: 1x6, drop 0

  // 7-12
  {rows: 1, columns: 6}, //  7: 1x6, drop 1
  {rows: 2, columns: 4}, //  8: 2x4, drop 0
  {rows: 2, columns: 4}, //  9: 2x4, drop 1
  {rows: 2, columns: 5}, // 10: 2x5, drop 0
  {rows: 2, columns: 5}, // 11: 2x5, drop 1
  {rows: 2, columns: 6}, // 12: 2x6, drop 0

  // 13-18
  {rows: 2, columns: 6}, // 13: 2x6, drop 1
  {rows: 2, columns: 6}, // 14: 2x6, drop 2
  {rows: 3, columns: 5}, // 15: 3x5, drop 0
  {rows: 3, columns: 5}, // 16: 3x5, drop 1
  {rows: 3, columns: 5}, // 17: 3x5, drop 2
  {rows: 3, columns: 6}, // 18: 3x6, drop 0
];

const minCarouselLayoutItems = carouselLayoutMap.findIndex(x => x !== null);
const maxCarouselLayoutItems = carouselLayoutMap.length - 1;
const shortestCarouselLayout = carouselLayoutMap[minCarouselLayoutItems];
const longestCarouselLayout = carouselLayoutMap[maxCarouselLayoutItems];

function unbound_getCarouselHTML({
  html,
  img,

  items,
  lazy = false,

  altFn = () => '',
  linkFn = (x, {text}) => text,
  srcFn,
}) {
  if (empty(items)) {
    return;
  }

  const {rows, columns} = (
    items.length < minCarouselLayoutItems ? shortestCarouselLayout :
    items.length > maxCarouselLayoutItems ? longestCarouselLayout :
    carouselLayoutMap[items.length]);

  items = items.slice(0, maxCarouselLayoutItems + 1);

  return html.tag('div',
    {
      class: 'carousel-container',
      'data-carousel-rows': rows,
      'data-carousel-columns': columns,
    },
    repeat(3,
      html.tag('div',
        {
          class: 'carousel-grid',
          'aria-hidden': 'true',
        },
        items
          .filter(item => srcFn(item))
          .filter(item => item.artTags.every(tag => !tag.isContentWarning))
          .map((item, i) =>
            html.tag('div', {class: 'carousel-item'},
              linkFn(item, {
                attributes: {
                  tabindex: '-1',
                },
                text:
                  img({
                    src: srcFn(item),
                    alt: altFn(item),
                    thumb: 'small',
                    lazy: typeof lazy === 'number' ? i >= lazy : lazy,
                    square: true,
                  }),
              }))))));
}

// Exports

export {
  unbound_getGridHTML as getGridHTML,
  unbound_getAlbumGridHTML as getAlbumGridHTML,
  unbound_getFlashGridHTML as getFlashGridHTML,
  unbound_getCarouselHTML as getCarouselHTML,
}
