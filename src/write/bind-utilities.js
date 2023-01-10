// Ties lots and lots of functions together in a convenient package accessible
// to page write functions. This is kept in a separate file from other write
// areas to keep imports neat and isolated.

import chroma from 'chroma-js';

import {
  fancifyFlashURL,
  fancifyURL,
  getAlbumGridHTML,
  getAlbumStylesheet,
  getArtistString,
  getCarouselHTML,
  getFlashGridHTML,
  getGridHTML,
  getRevealStringFromTags,
  getRevealStringFromWarnings,
  getThemeString,
  generateAdditionalFilesList,
  generateAdditionalFilesShortcut,
  generateChronologyLinks,
  generateCoverLink,
  generateInfoGalleryLinks,
  generateTrackListDividedByGroups,
  generateNavigationLinks,
  generateStickyHeadingContainer,
  iconifyURL,
  img,
} from '../misc-templates.js';

import {
  replacerSpec,
  transformInline,
  transformLyrics,
  transformMultiline,
} from '../util/transform-content.js';

import * as html from '../util/html.js';

import {bindOpts, withEntries} from '../util/sugar.js';
import {getColors} from '../util/colors.js';
import {bindFind} from '../util/find.js';

import link, {getLinkThemeString} from '../util/link.js';

import {
  getAlbumCover,
  getArtistAvatar,
  getFlashCover,
  getTrackCover,
} from '../util/wiki-data.js';

export function bindUtilities({
  absoluteTo,
  getSizeOfAdditionalFile,
  language,
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
    getSizeOfAdditionalFile,
    html,
    language,
    to,
    urls,
    wikiData,
  })

  bound.img = bindOpts(img, {
    [bindOpts.bindIndex]: 0,
    html,
  });

  bound.getColors = bindOpts(getColors, {
    chroma,
  });

  bound.getLinkThemeString = bindOpts(getLinkThemeString, {
    getColors: bound.getColors,
  });

  bound.getThemeString = bindOpts(getThemeString, {
    getColors: bound.getColors,
  });

  bound.link = withEntries(link, (entries) =>
    entries
      .map(([key, fn]) => [key, bindOpts(fn, {
        getLinkThemeString: bound.getLinkThemeString,
        to,
      })]));

  bound.find = bindFind(wikiData, {mode: 'warn'});

  bound.transformInline = bindOpts(transformInline, {
    find: bound.find,
    link: bound.link,
    replacerSpec,
    language,
    to,
    wikiData,
  });

  bound.transformMultiline = bindOpts(transformMultiline, {
    img: bound.img,
    to,
    transformInline: bound.transformInline,
  });

  bound.transformLyrics = bindOpts(transformLyrics, {
    transformInline: bound.transformInline,
    transformMultiline: bound.transformMultiline,
  });

  bound.iconifyURL = bindOpts(iconifyURL, {
    html,
    language,
    to,
  });

  bound.fancifyURL = bindOpts(fancifyURL, {
    html,
    language,
  });

  bound.fancifyFlashURL = bindOpts(fancifyFlashURL, {
    [bindOpts.bindIndex]: 2,
    html,
    language,

    fancifyURL: bound.fancifyURL,
  });

  bound.getRevealStringFromWarnings = bindOpts(getRevealStringFromWarnings, {
    html,
    language,
  });

  bound.getRevealStringFromTags = bindOpts(getRevealStringFromTags, {
    language,

    getRevealStringFromWarnings: bound.getRevealStringFromWarnings,
  });

  bound.getArtistString = bindOpts(getArtistString, {
    html,
    link: bound.link,
    language,

    iconifyURL: bound.iconifyURL,
  });

  bound.getAlbumCover = bindOpts(getAlbumCover, {
    to,
  });

  bound.getTrackCover = bindOpts(getTrackCover, {
    to,
  });

  bound.getFlashCover = bindOpts(getFlashCover, {
    to,
  });

  bound.getArtistAvatar = bindOpts(getArtistAvatar, {
    to,
  });

  bound.generateAdditionalFilesShortcut = bindOpts(generateAdditionalFilesShortcut, {
    html,
    language,
  });

  bound.generateAdditionalFilesList = bindOpts(generateAdditionalFilesList, {
    html,
    language,
  });

  bound.generateNavigationLinks = bindOpts(generateNavigationLinks, {
    link: bound.link,
    language,
  });

  bound.generateStickyHeadingContainer = bindOpts(generateStickyHeadingContainer, {
    [bindOpts.bindIndex]: 0,
    getRevealStringFromTags: bound.getRevealStringFromTags,
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

  bound.generateCoverLink = bindOpts(generateCoverLink, {
    [bindOpts.bindIndex]: 0,
    html,
    img: bound.img,
    link: bound.link,
    language,
    to,
    wikiData,

    getRevealStringFromTags: bound.getRevealStringFromTags,
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

    getRevealStringFromTags: bound.getRevealStringFromTags,
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
  })

  bound.getAlbumStylesheet = bindOpts(getAlbumStylesheet, {
    to,
  });

  return bound;
}
