export default {
  contentDependencies: ['linkThing'],

  relations: (relation, artist) =>
    ({link: relation('linkThing', 'localized.artistGallery', artist)}),

  generate: (relations) => relations.link,
};
