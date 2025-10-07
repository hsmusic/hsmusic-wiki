export default {
  relations: (relation, album) =>
    ({link: relation('linkThing', 'localized.albumReferencingArtworks', album)}),

  generate: (relations) => relations.link,
};
