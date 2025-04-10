import Thing from '#thing';

export default {
  contentDependencies: [
    'linkAlbumReferencingArtworks',
    'linkTrackReferencingArtworks',
  ],

  query: (artwork) => ({
    referenceType:
      artwork.thing.constructor[Thing.referenceType],
  }),

  relations: (relation, query, artwork) => ({
    link:
      (query.referenceType === 'album'
        ? relation('linkAlbumReferencingArtworks', artwork.thing)
     : query.referenceType === 'track'
        ? relation('linkTrackReferencingArtworks', artwork.thing)
        : null),
  }),

  generate: (relations) => relations.link,
};
