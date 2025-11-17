export default {
  relations: (relation, motif) => ({
    link:
      relation('linkMotif', motif),
  }),

  generate: (relations) =>
    relations.link.slot('proferTooltip', false),
};
