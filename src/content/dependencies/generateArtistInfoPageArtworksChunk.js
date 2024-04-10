export default {
  contentDependencies: [
    'generateArtistInfoPageChunk',
    'generateArtistInfoPageArtworksChunkItem',
    'linkAlbum',
  ],

  relations: (relation, album, contribs) => ({
    template:
      relation('generateArtistInfoPageChunk'),

    albumLink:
      relation('linkAlbum', album),

    // Intentional mapping here: each item may be associated with
    // more than one contribution. (Note: this is only currently
    // applicable for track contributions, but we're retaining the
    // structure in other contributions too.)
    items:
      contribs
        .map(contrib =>
          relation('generateArtistInfoPageArtworksChunkItem', contrib)),
  }),

  data: (_album, contribs) => ({
    dates:
      contribs
        .map(contrib => contrib.date),
  }),

  generate: (data, relations) =>
    relations.template.slots({
      mode: 'album',
      albumLink: relations.albumLink,
      dates: data.dates,
      items: relations.items,
    }),
};
