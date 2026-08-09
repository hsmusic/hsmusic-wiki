export default {
  relations: (relation, album, property) => ({
    heading:
      relation('generateContentHeading'),

    albumLink:
      relation('linkAlbum', album),

    albumChunk:
      relation('generateListAllAdditionalFilesAlbumChunk',
        album,
        album[property] ?? []),

    trackChunks:
      album.tracks.map(track =>
        relation('generateListAllAdditionalFilesTrackChunk',
          track,
          track[property] ?? [])),
  }),

  slots: {
    stringsKey: {type: 'string'},
  },

  generate: (relations, slots, {html}) =>
    html.tags([
      relations.heading.slots({
        tag: 'h3',
        title: relations.albumLink,
      }),

      html.tag('dl',
        {[html.onlyIfContent]: true},

        relations.albumChunk.slot('stringsKey', slots.stringsKey),

        relations.trackChunks.map(trackChunk =>
          trackChunk.slot('stringsKey', slots.stringsKey))),
    ]),
};
