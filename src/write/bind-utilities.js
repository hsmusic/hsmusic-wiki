// Ties lots and lots of functions together in a convenient package accessible
// to page write functions. This is kept in a separate file from other write
// areas to keep imports neat and isolated.

import chroma from 'chroma-js';

import {getColors} from '#colors';
import {bindFind} from '#find';
import * as html from '#html';
import {bindOpts} from '#sugar';
import {thumb} from '#urls';

import {
  getDimensionsOfImagePath,
  getThumbnailEqualOrSmaller,
  getThumbnailsAvailableForDimensions,
} from '#thumbs';

export function bindUtilities({
  absoluteTo,
  cachebust,
  defaultLanguage,
  getSizeOfAdditionalFile,
  getSizeOfImagePath,
  language,
  languages,
  pagePath,
  thumbsCache,
  to,
  urls,
  wikiData,
}) {
  const bound = {};

  Object.assign(bound, {
    absoluteTo,
    cachebust,
    defaultLanguage,
    getSizeOfAdditionalFile,
    getSizeOfImagePath,
    getThumbnailsAvailableForDimensions,
    html,
    language,
    languages,
    pagePath,
    thumb,
    to,
    urls,
    wikiData,
    wikiInfo: wikiData.wikiInfo,
  });

  bound.getColors = bindOpts(getColors, {chroma});

  bound.find = bindFind(wikiData, {mode: 'warn'});

  bound.getDimensionsOfImagePath =
    (imagePath) =>
      getDimensionsOfImagePath(imagePath, thumbsCache);

  bound.getThumbnailEqualOrSmaller =
    (preferred, imagePath) =>
      getThumbnailEqualOrSmaller(preferred, imagePath, thumbsCache);

  return bound;
}
