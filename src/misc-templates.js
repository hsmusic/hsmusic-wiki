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

function unbound_getCarouselHTML({
  html,
  img,

  items,
  lazy = false,

  altFn = () => '',
  linkFn = (x, {text}) => text,
  srcFn,
}) {
}

// Exports

export {
  unbound_getGridHTML as getGridHTML,
  unbound_getAlbumGridHTML as getAlbumGridHTML,
  unbound_getFlashGridHTML as getFlashGridHTML,
  unbound_getCarouselHTML as getCarouselHTML,
}
