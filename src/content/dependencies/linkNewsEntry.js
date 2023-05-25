export default {
  contentDependencies: ['linkThing'],

  relations: (relation, newsEntry) =>
    ({link: relation('linkThing', 'localized.newsEntry', newsEntry)}),

  generate: (relations) => relations.link,
};
