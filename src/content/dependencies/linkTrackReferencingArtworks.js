export default {
  relations: (relation, track) =>
    ({link: relation('linkThing', 'localized.trackReferencingArtworks', track)}),

  generate: (relations) => relations.link,
};
