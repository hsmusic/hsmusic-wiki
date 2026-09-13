export default {
  relations: (relation, row) => ({
    coverCarousel:
      relation('generateCoverCarousel', row.carousel),
  }),

  generate: (relations) =>
    relations.coverCarousel,
};
