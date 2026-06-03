export default {
  relations: (relation, artist, album, contribs) => ({
    template:
      relation('generateArtistInfoPageChunk'),

    albumLink:
      relation('linkAlbum', album),

    items:
      contribs.map(contribs =>
        relation('generateArtistInfoPageAdditionalFilesChunkItem',
          artist,
          contribs)),
  }),

  slots: {
    string: {
      type: 'string',
      default: 'additionalFile',
    },

    disableStandaloneWithFiles: {
      type: 'boolean',
      default: false,
    },
  },

  generate: (relations, slots, {html}) =>
    relations.template.slots({
      mode: 'album',

      link:
        relations.albumLink
          .slot('showNameDetail', 'accent'),

      list:
        html.tag('ul',
          relations.items
            .map(item => item.slots({
              string: slots.string,
              disableStandaloneWithFiles: slots.disableStandaloneWithFiles,
            }))),
    }),
};
