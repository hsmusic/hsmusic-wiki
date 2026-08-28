export default {
  relations: (relation, album, contribs) => ({
    template:
      relation('generateArtistInfoPageChunk', album),

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

    id: {type: 'string'},
  },

  generate: (data, relations, slots, {html}) =>
    relations.template.slots({
      mode: 'album',
      id: slots.id,

      link:
        relations.albumLink
          .slot('showNameDetail', 'accent'),

      dates:
        (slots.filterEditsForWiki
          ? Array.from({length: data.dates}, () => null)
          : data.dates),

      list:
        html.tag('ul',
          relations.items.map(item =>
            item.slot('filterEditsForWiki', slots.filterEditsForWiki))),
    }),
};
