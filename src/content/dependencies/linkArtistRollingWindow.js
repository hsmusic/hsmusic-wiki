export default {
  contentDependencies: ['linkThing'],

  relations: (relation, artist) =>
    ({link: relation('linkThing', 'localized.artistRollingWindow', artist)}),

  generate: (relations) => relations.link,
};
