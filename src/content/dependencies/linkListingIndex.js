export default {
  contentDependencies: ['linkStationaryIndex'],

  relations: (relation) =>
    ({link:
        relation(
          'linkStationaryIndex',
          'localized.listingIndex',
          'listingIndex.title')}),

  generate: (relations) => relations.link,
};
