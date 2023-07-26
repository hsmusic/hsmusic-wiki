export default {
  contentDependencies: ['linkStationaryIndex'],

  relations: (relation) =>
    ({link:
        relation(
          'linkStationaryIndex',
          'localized.newsIndex',
          'newsIndex.title')}),

  generate: (relations) => relations.link,
};
