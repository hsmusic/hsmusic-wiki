export default {
  contentDependencies: ['linkAlbum', 'linkTrack'],

  query: (artwork) => ({
    referenceType:
      artwork.thing.constructor[Symbol.for('Thing.referenceType')],
  }),

  relations: (relation, query, artwork) => ({
    link:
      (query.referenceType === 'album'
        ? relation('linkAlbum', artwork.thing)
     : query.referenceType === 'track'
        ? relation('linkTrack', artwork.thing)
        : null),
  }),

  generate: (relations) =>
    relations.link,
};
