export const description = `wiki-wide listing pages & index`;

import {getListingPaths} from '#page-util';

export function pathsTargetless({wikiData}) {
  return getListingPaths({scope: 'wiki', wikiData});
}
