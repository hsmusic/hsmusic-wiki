export default {
  contentDependencies: ['linkThing'],

  relations: (relation, album) =>
    ({link: relation('linkThing', 'localized.album', album)}),

  generate: (relations) => relations.link,
};
