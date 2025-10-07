export default {
  relations: (relation, flash) => ({
    coverArtwork:
      relation('generateCoverArtwork', flash.coverArtwork),
  }),

  generate: (relations) =>
    relations.coverArtwork,
};
