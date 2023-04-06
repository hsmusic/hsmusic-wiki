export default {
  contentDependencies: ['linkThing'],

  relations: (relation, artTag) =>
    ({link: relation('linkThing', 'localized.tag', artTag)}),

  generate: (relations) => relations.link,
};
