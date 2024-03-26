export default {
  contentDependencies: ['linkStationaryIndex', 'linkThing'],
  extraDependencies: ['language'],

  relations(relation, listing) {
    const urlKey =
      (listing.directory === 'index'
        ? `localized.${listing.scope}ListingIndex`
        : `localized.${listing.scope}Listing`);

    const link =
      (listing.directory === 'index'
        ? relation('linkStationaryIndex', urlKey, null)
        : relation('linkThing', urlKey, listing));

    return {link};
  },

  data: (listing) => ({
    stringsKey: listing.stringsKey,
  }),

  generate: (data, relations, {language}) =>
    relations.link
      .slot('content',
        language.$(data.stringsKey, 'title')),
};
