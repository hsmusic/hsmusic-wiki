export default {
  relations: (relation, artTag) =>
    ({link: relation('linkThing', 'localized.artTagGallery', artTag)}),

  generate: (relations) => relations.link,
};
