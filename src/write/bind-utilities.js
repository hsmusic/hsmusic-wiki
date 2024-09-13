// Ties lots and lots of functions together in a convenient package accessible
// to page write functions. This is kept in a separate file from other write
// areas to keep imports neat and isolated.

import chroma from 'chroma-js';

import {getColors} from '#colors';
import {bindFind} from '#find';
import * as html from '#html';
import {bindOpts} from '#sugar';
import {getURLsFrom, getURLsFromRoot, thumb} from '#urls';

import {
  checkIfImagePathHasCachedThumbnails,
  getDimensionsOfImagePath,
  getThumbnailEqualOrSmaller,
  getThumbnailsAvailableForDimensions,
} from '#thumbs';

export function bindLanguageAndPathUtilities({
  defaultLanguage,
  language,
  languages,
  pagePath,
  pagePathStringFromRoot,
  urls,
}) {
  const bound = {
    defaultLanguage,
    language,
    languages,
    pagePath,
    pagePathStringFromRoot,
    thumb,
    urls,
  };

  const baseDirectory =
    (language === defaultLanguage
      ? ''
      : language.code);

  bound.to =
    getURLsFrom(pagePath, {baseDirectory, urls});

  bound.absoluteTo =
    getURLsFromRoot({baseDirectory, urls});

  return bound;
}

export function bindUtilities({
  defaultLanguage,
  getSizeOfAdditionalFile,
  getSizeOfImagePath,
  language,
  languages,
  missingImagePaths,
  pagePath,
  pagePathStringFromRoot,
  thumbsCache,
  urls,
  wikiData,
}) {
  const bound = {
    ...bindLanguageAndPathUtilities({
      defaultLanguage,
      language,
      languages,
      pagePath,
      pagePathStringFromRoot,
      urls,
    }),

    html,

    missingImagePaths,

    wikiData,
    wikiInfo: wikiData.wikiInfo,

    getSizeOfAdditionalFile,
    getSizeOfImagePath,
    getThumbnailsAvailableForDimensions,
  };

  bound.getColors =
    bindOpts(getColors, {chroma});

  bound.find =
    bindFind(wikiData, {mode: 'warn'});

  bound.checkIfImagePathHasCachedThumbnails =
    (imagePath) =>
      checkIfImagePathHasCachedThumbnails(imagePath, thumbsCache);

  bound.getDimensionsOfImagePath =
    (imagePath) =>
      getDimensionsOfImagePath(imagePath, thumbsCache);

  bound.getThumbnailEqualOrSmaller =
    (preferred, imagePath) =>
      getThumbnailEqualOrSmaller(preferred, imagePath, thumbsCache);

  return bound;
}
