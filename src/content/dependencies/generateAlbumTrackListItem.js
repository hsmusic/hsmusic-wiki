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
    albumStyle: album.style,

    trackHasDuration: query.trackHasDuration,
    sectionHasDuration: query.sectionHasDuration,
    albumHasDuration: query.albumHasDuration,

    colorize:
      track.color !== album.color,
  }),

  slots: {
    attributes: {type: 'attributes', mutable: false},
    setTrackNumberAttribute: {type: 'boolean', default: false},

    anchor: {type: 'boolean'},
    linkless: {type: 'boolean'},
    hash: {type: 'string'},

    showArtists: {type: 'boolean', default: true},
    showDuration: {type: 'boolean', default: false},

    collapseDurationScope: {
      validate: v =>
        v.is('never', 'track', 'section', 'album'),

      default: 'album',
    },
  },

  generate: (data, relations, slots) =>
    relations.item.slots({
      attributes: slots.attributes,
      setTrackNumberAttribute: slots.setTrackNumberAttribute,

      anchor: slots.anchor,
      linkless: slots.linkless,
      hash: slots.hash,

      showArtists: slots.showArtists,

      showNameDetail:
        'from within section',

      showDuration:
        slots.showDuration &&
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
