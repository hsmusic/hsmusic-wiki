export default {
  relations: (relation, track) => ({
    trackLink:
      relation('linkTrack', track),
  }),

  data: (track) => ({
    albumName:
      track.album.name,

    albumColor:
      track.album.color,
  }),

  generate: (data, relations, {language}) =>
    relations.trackLink.slots({
      content: language.sanitize(data.albumName),
      color: data.albumColor,
    }),
};
