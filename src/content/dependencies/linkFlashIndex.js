export default {
  contentDependencies: ['linkStationaryIndex'],

  relations: (relation) =>
    ({link:
        relation(
          'linkStationaryIndex',
          'localized.flashIndex',
          'flashIndex.title')}),

  generate: (relations) => relations.link,
};
