export default {
  contentDependencies: [
    'generateArtistInfoPageChunk',
    'generateArtistInfoPageArtworksChunkItem',
    'linkAlbum',
  ],

  extraDependencies: ['html'],

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

  slots: {
    filterEditsForWiki: {
      type: 'boolean',
      default: false,
    },
  },

  generate: (data, relations, slots) =>
    relations.template.slots({
      mode: 'album',
      albumLink: relations.albumLink,

      dates:
        (slots.filterEditsForWiki
          ? Array.from({length: data.dates}, () => null)
          : data.dates),

      items:
        relations.items.map(item =>
          item.slot('filterEditsForWiki', slots.filterEditsForWiki)),
    }),
};
