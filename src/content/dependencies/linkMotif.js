export default {
  relations: (relation, motif) =>
    ({link: relation('linkThing', 'localized.motifInfo', motif)}),

  generate: (relations) => relations.link,
};
