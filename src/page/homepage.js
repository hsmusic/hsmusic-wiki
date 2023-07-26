// Homepage specification.

import {
  bindOpts,
  empty,
  withEntries,
} from '../util/sugar.js';

import {
  getNewAdditions,
  getNewReleases,
} from '../util/wiki-data.js';

export const description = `main wiki homepage`;

export function pathsTargetless({wikiData}) {
  return [
    {
      type: 'page',
      path: ['home'],

      contentFunction: {
        name: 'generateWikiHomePage',
        args: [wikiData.homepageLayout],
      },
    },
  ];
}
