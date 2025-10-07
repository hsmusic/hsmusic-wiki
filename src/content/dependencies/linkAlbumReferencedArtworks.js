export default {
  relations: (relation, album) =>
    ({link: relation('linkThing', 'localized.albumReferencedArtworks', album)}),

  generate: (relations) => relations.link,
};
