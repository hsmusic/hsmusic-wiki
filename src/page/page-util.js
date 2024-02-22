export function getListingPaths({
  scope,
  thing = null,
  wikiData,
}) {
  const filter = listing =>
    listing.contentFunction &&
    (listing.featureFlag
      ? wikiData.wikiInfo[listing.featureFlag]
      : true);

  const contentFunction = listing => ({
    name: listing.contentFunction,
    args:
      (thing
        ? [listing, thing]
        : [listing]),
  });

  const listings =
    wikiData.listingSpec
      .filter(listing => listing.scope === scope);

  const indexListing =
    listings
      .find(listing => listing.directory === 'index');

  const nonIndexListings =
    listings
      .filter(listing => listing.directory !== 'index');

  const pathEntries = [];

  if (indexListing && filter(indexListing)) {
    pathEntries.push({
      type: 'page',
      path: [`${scope}ListingIndex`],
      contentFunction: contentFunction(indexListing),
    });
  }

  for (const listing of nonIndexListings) {
    if (filter(listing)) {
      pathEntries.push({
        type: 'page',
        path: [`${scope}Listing`, listing.directory],
        contentFunction: contentFunction(listing),
      });
    }
  }

  return pathEntries;
}
