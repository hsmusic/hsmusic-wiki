export default {
  relations: (relation, artwork) => ({
    link:
      (artwork.thing.isAlbum
        ? relation('linkAlbum', artwork.thing)
     : artwork.thing.isTrack
        ? relation('linkTrack', artwork.thing)
        : null),
  }),

  generate: (relations) =>
    relations.link,
};
