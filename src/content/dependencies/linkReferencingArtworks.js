export default {
  relations: (relation, artwork) => ({
    link:
      (artwork.thing.isAlbum
        ? relation('linkAlbumReferencingArtworks', artwork.thing)
     : artwork.thing.isTrack
        ? relation('linkTrackReferencingArtworks', artwork.thing)
        : null),
  }),

  generate: (relations) => relations.link,
};
