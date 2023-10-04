export default {
  contentDependencies: ['linkThing'],

  relations: (relation, artTag) =>
    ({link: relation('linkThing', 'localized.artTagInfo', artTag)}),

  generate: (relations) => relations.link,
};
