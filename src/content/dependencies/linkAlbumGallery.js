export default {
  contentDependencies: ['linkThing'],

  relations: (relation, album) =>
    ({link: relation('linkThing', 'localized.albumGallery', album)}),

  generate: (relations) => relations.link,
};
