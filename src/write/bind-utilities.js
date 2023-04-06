// Ties lots and lots of functions together in a convenient package accessible
// to page write functions. This is kept in a separate file from other write
// areas to keep imports neat and isolated.

import chroma from 'chroma-js';

import {
  replacerSpec,
  transformInline,
  // transformLyrics,
  // transformMultiline,
} from '../util/transform-content.js';

import * as html from '../util/html.js';

import {bindOpts} from '../util/sugar.js';
import {getColors} from '../util/colors.js';
import {bindFind} from '../util/find.js';
import {thumb} from '../util/urls.js';

export function bindUtilities({
  absoluteTo,
  cachebust,
  defaultLanguage,
  getSizeOfAdditionalFile,
  getSizeOfImageFile,
  language,
  languages,
  to,
  urls,
  wikiData,
}) {
  // TODO: Is there some nicer way to define these,
  // may8e without totally re-8inding everything for
  // each page?
  const bound = {};

  Object.assign(bound, {
    absoluteTo,
    cachebust,
    defaultLanguage,
    getSizeOfAdditionalFile,
    getSizeOfImageFile,
    html,
    language,
    languages,
    thumb,
    to,
    urls,
    wikiData,
  });

  bound.getColors = bindOpts(getColors, {chroma});

  bound.find = bindFind(wikiData, {mode: 'warn'});

  bound.transformInline = bindOpts(transformInline, {
    find: bound.find,
    link: bound.link,
    replacerSpec,
    language,
    to,
    wikiData,
  });

  /*
  bound.transformMultiline = bindOpts(transformMultiline, {
    img: bound.img,
    to,
    transformInline: bound.transformInline,
  });

  bound.transformLyrics = bindOpts(transformLyrics, {
    transformInline: bound.transformInline,
    transformMultiline: bound.transformMultiline,
  });
  */

  /*
  bound.generateNavigationLinks = bindOpts(generateNavigationLinks, {
    link: bound.link,
    language,
  });

  bound.generateStickyHeadingContainer = bindOpts(generateStickyHeadingContainer, {
    [bindOpts.bindIndex]: 0,
    html,
    img: bound.img,
  });

  bound.generateChronologyLinks = bindOpts(generateChronologyLinks, {
    html,
    language,
    link: bound.link,
    wikiData,

    generateNavigationLinks: bound.generateNavigationLinks,
  });

  bound.generateInfoGalleryLinks = bindOpts(generateInfoGalleryLinks, {
    [bindOpts.bindIndex]: 2,
    link: bound.link,
    language,
  });

  bound.generateTrackListDividedByGroups = bindOpts(generateTrackListDividedByGroups, {
    html,
    language,
    wikiData,
  });

  bound.getGridHTML = bindOpts(getGridHTML, {
    [bindOpts.bindIndex]: 0,
    img: bound.img,
    html,
    language,

    getRevealStringFromArtTags: bound.getRevealStringFromArtTags,
  });

  bound.getAlbumGridHTML = bindOpts(getAlbumGridHTML, {
    [bindOpts.bindIndex]: 0,
    link: bound.link,
    language,

    getAlbumCover: bound.getAlbumCover,
    getGridHTML: bound.getGridHTML,
  });

  bound.getFlashGridHTML = bindOpts(getFlashGridHTML, {
    [bindOpts.bindIndex]: 0,
    link: bound.link,

    getFlashCover: bound.getFlashCover,
    getGridHTML: bound.getGridHTML,
  });

  bound.getCarouselHTML = bindOpts(getCarouselHTML, {
    [bindOpts.bindIndex]: 0,
    img: bound.img,
    html,
  });
  */

  return bound;
}
