export default {
  contentDependencies: ['linkStationaryIndex'],

  relations: (relation) =>
    ({link:
        relation(
          'linkStationaryIndex',
          'localized.commentaryIndex',
          'commentaryIndex.title')}),

  generate: (relations) => relations.link,
};
