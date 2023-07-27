// Listing page specification.
//
// The targets here are a bit different than for most pages: rather than data
// objects loaded from text files in the wiki data directory, they're hard-
// coded specifications, with various JS functions for processing wiki data
// and turning it into user-readable HTML listings.
//
// Individual listing specs are described in src/listing-spec.js, but are
// provided via wikiData like other (normal) data objects.

import {empty} from '../util/sugar.js';

import {getTotalDuration} from '../util/wiki-data.js';

export const description = `wiki-wide listing pages & index`;

export function targets({wikiData}) {
  return (
    wikiData.listingSpec
      .filter(listing => listing.contentFunction)
      .filter(listing =>
        !listing.featureFlag ||
        wikiData.wikiInfo[listing.featureFlag]));
}

export function pathsForTarget(listing) {
  return [
    {
      type: 'page',
      path: ['listing', listing.directory],
      contentFunction: {
        name: listing.contentFunction,
        args: [listing],
      },
    },
  ];
}

export function pathsTargetless() {
  return [
    {
      type: 'page',
      path: ['listingIndex'],
      contentFunction: {name: 'generateListingsIndexPage'},
    },
  ];
}
