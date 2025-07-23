export default {
  contentDependencies: ['linkThing'],

  relations: (relation, medium) =>
    ({link: relation('linkThing', 'localized.medium', medium)}),

  generate: (relations) => relations.link,
};
