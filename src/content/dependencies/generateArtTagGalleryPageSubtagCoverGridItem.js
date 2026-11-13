export default {
  query(supertag, subtag, subsubtag) {
    return {artwork: null};
  },

  relations: (relation, query, _supertag, _subtag, subsubtag) => ({
    coverGridItem:
      (query.artwork
        ? relation('generateCoverGridItem', query.artwork, subsubtag)
        : relation('generateCoverGridItem', subsubtag)),
  }),

  generate: (relations) => relations.coverGridItem,
};
