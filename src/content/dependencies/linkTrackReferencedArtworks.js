export default {
  relations: (relation, track) =>
    ({link: relation('linkThing', 'localized.trackReferencedArtworks', track)}),

  generate: (relations) => relations.link,
};
