export const description = `wiki-wide listing pages & index`;

// The targets here are a bit different than for most pages: rather than data
// objects loaded from text files in the wiki data directory, they're hard-
// coded specifications, each directly identifying the hard-coded content
// function used to generate that listing.
//
// Individual listing specs are described in src/listing-spec.js, but are
// provided via wikiData like other (normal) data objects.
//
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
