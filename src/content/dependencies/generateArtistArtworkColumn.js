export default {
  relations: (relation, artist) => ({
    coverArtwork:
      (artist.hasAvatar
        ? relation('generateCoverArtwork', artist.avatarArtwork)
        : null),
  }),

  generate: (relations) =>
    relations.coverArtwork,
};
