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
