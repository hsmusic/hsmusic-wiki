export default {
  contentDependencies: ['linkThing'],

  relations: (relation, flash) =>
    ({link: relation('linkThing', 'localized.flash', flash)}),

  generate: (relations) => relations.link,
};
