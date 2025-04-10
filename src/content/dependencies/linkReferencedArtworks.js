import Thing from '#thing';

export default {
  contentDependencies: [
    'linkAlbumReferencedArtworks',
    'linkTrackReferencedArtworks',
  ],

  query: (artwork) => ({
    referenceType:
      artwork.thing.constructor[Thing.referenceType],
  }),

  relations: (relation, query, artwork) => ({
    link:
      (query.referenceType === 'album'
        ? relation('linkAlbumReferencedArtworks', artwork.thing)
     : query.referenceType === 'track'
        ? relation('linkTrackReferencedArtworks', artwork.thing)
        : null),
  }),

  generate: (relations) => relations.link,
};
