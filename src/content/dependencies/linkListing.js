export default {
  contentDependencies: ['linkThing'],
  extraDependencies: ['language'],

  relations: (relation, listing) =>
    ({link: relation('linkThing', 'localized.listing', listing)}),

  data: (listing) =>
    ({stringsKey: listing.stringsKey}),

  generate: (data, relations, {language}) =>
    relations.link
      .slot('content', language.$(`listingPage.${data.stringsKey}.title`)),
};
