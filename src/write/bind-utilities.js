// Ties lots and lots of functions together in a convenient package accessible
// to page write functions. This is kept in a separate file from other write
// areas to keep imports neat and isolated.

import chroma from 'chroma-js';

import {getColors} from '#colors';
import {bindFind} from '#find';
import * as html from '#html';
import {bindOpts} from '#sugar';
import {thumb} from '#urls';

export function bindUtilities({
  absoluteTo,
  cachebust,
  defaultLanguage,
  getSizeOfAdditionalFile,
  getSizeOfImageFile,
  language,
  languages,
  pagePath,
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
    getSizeOfImageFile,
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

  return bound;
}
