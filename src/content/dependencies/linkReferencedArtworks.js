export default {
  contentDependencies: [
    'linkAlbumReferencedArtworks',
    'linkTrackReferencedArtworks',
  ],

  relations: (relation, artwork) => ({
    link:
      (artwork.thing.isAlbum
        ? relation('linkAlbumReferencedArtworks', artwork.thing)
     : artwork.thing.isTrack
        ? relation('linkTrackReferencedArtworks', artwork.thing)
        : null),
  }),

  generate: (relations) => relations.link,
};
