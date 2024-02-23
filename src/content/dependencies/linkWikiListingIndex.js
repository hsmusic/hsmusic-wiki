export default {
  contentDependencies: ['linkListing'],
  extraDependencies: ['wikiData'],

  sprawl: ({listingData}) => ({
    wikiListingIndex:
      listingData.find(listing =>
        listing.scope === 'wiki' &&
        listing.directory === 'index'),
  }),

  relations: (relation, sprawl) => ({
    listingLink:
      relation('linkListing', sprawl.wikiListingIndex),
  }),

  generate: (relations) =>
    relations.listingLink,
};
