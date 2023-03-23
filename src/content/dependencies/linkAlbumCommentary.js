export default {
  contentDependencies: ['linkThing'],

  relations: (relation, album) =>
    ({link: relation('linkThing', 'localized.albumCommentary', album)}),

  generate: (relations) => relations.link,
};
