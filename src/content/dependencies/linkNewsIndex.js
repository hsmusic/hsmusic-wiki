export default {
  relations: (relation) =>
    ({link:
        relation(
          'linkStationaryIndex',
          'localized.newsIndex',
          'newsIndex.title')}),

  generate: (relations) => relations.link,
};
