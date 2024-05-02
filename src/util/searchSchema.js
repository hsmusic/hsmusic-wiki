// Index structures shared by client and server.

export function makeSearchIndexes(FlexSearch, documentOptions = {}) {
  const doc = documentSchema =>
    new FlexSearch.Document({
      id: 'reference',
      ...documentOptions,
      ...documentSchema,
    });

  const indexes = {
    albums: doc({
      index: ['name', 'groups'],
    }),

    tracks: doc({
      index: [
        'name',
        'album',
        'artists',
        'additionalNames',
      ],

      store: [
        'color',
        'name',
        'albumDirectory',
        'artworkKind',
      ],
    }),

    artists: doc({
      index: ['names'],
    }),

    groups: doc({
      index: ['name', 'description', 'category'],
    }),

    flashes: doc({
      index: ['name', 'tracks', 'contributors'],
    }),
  };

  return indexes;
}
