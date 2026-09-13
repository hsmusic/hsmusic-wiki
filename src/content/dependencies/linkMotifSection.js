export default {
  relations: (relation, motifSection) => ({
    link:
      relation('linkMotifInParticularlyBoringManner', motifSection.motifs[0]),
  }),

  data: (motifSection) => ({
    name:
      motifSection.name,
  }),

  generate: (data, relations, {language}) =>
    relations.link
      .slot('content', language.sanitize(data.name)),
};
