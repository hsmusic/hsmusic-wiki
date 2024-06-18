export default {
  contentDependencies: [
    'linkAlbum',
    'linkFlash',
    'linkTrack',
  ],

  query: (thing) => ({
    referenceType: thing.constructor[Symbol.for('Thing.referenceType')],
  }),

  relations: (relation, query, thing) => ({
    link:
      (query.referenceType === 'album'
        ? relation('linkAlbum', thing)
     : query.referenceType === 'flash'
        ? relation('linkFlash', thing)
     : query.referenceType === 'track'
        ? relation('linkTrack', thing)
        : null),
  }),

  generate: (relations) =>
    relations.link,
};
