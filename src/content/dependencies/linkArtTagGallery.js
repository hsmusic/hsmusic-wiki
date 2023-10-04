export default {
  contentDependencies: ['linkThing'],

  relations: (relation, artTag) =>
    ({link: relation('linkThing', 'localized.artTagGallery', artTag)}),

  generate: (relations) => relations.link,
};
