export default {
  query: (track, album) => ({
    trackHasDuration:
      !!track.duration,

    sectionHasDuration:
      !album.trackSections
        .some(section =>
          section.tracks.every(track => !track.duration) &&
          section.tracks.includes(track)),

    albumHasDuration:
      album.tracks.some(track => track.duration),
  }),

  relations: (relation, query, track) => ({
    item:
      relation('generateTrackListItem',
        track,
        track.album.trackArtistContribs),
  }),

  data: (query, track, album) => ({
    trackHasDuration: query.trackHasDuration,
    sectionHasDuration: query.sectionHasDuration,
    albumHasDuration: query.albumHasDuration,

    colorize:
      track.color !== album.color,
  }),

  slots: {
    collapseDurationScope: {
      validate: v =>
        v.is('never', 'track', 'section', 'album'),

      default: 'album',
    },
  },

  generate: (data, relations, slots) =>
    relations.item.slots({
      showArtists: 'auto',
      showDetail: true,

      showDuration:
        (slots.collapseDurationScope === 'track'
          ? data.trackHasDuration
       : slots.collapseDurationScope === 'section'
          ? data.sectionHasDuration
       : slots.collapseDurationScope === 'album'
          ? data.albumHasDuration
          : true),

      colorMode:
        (data.colorize
          ? 'line'
          : 'none'),
    }),
};
