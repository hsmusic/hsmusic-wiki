export default {
  relations: (relation) =>
    ({link:
        relation(
          'linkStationaryIndex',
          'localized.wikiUpdateIndex',
          'wikiUpdateIndex.title')}),

  generate: (relations) => relations.link,
};
