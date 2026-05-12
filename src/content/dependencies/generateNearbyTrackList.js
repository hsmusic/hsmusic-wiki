export default {
  query: (tracks, contextTrack, _contextContributions) => ({
    presentedTracks:
      (contextTrack
        ? tracks.map(track =>
            track.otherReleases.find(({album}) => album === contextTrack.album) ??
            track)
        : tracks),
  }),

  relations: (relation, query, _tracks, _contextTrack, contextContributions) => ({
    items:
      query.presentedTracks
        .map(track => relation('generateTrackListItem', track, contextContributions)),
  }),

  slots: {
    showArtists: {
      validate: v => v.is(true, false, 'auto'),
      default: 'auto',
    },

    showDuration: {
      type: 'boolean',
      default: false,
    },

    showDetail: {
      type: 'boolean',
      default: true,
    },

    colorMode: {
      validate: v => v.is('none', 'track', 'line'),
      default: 'track',
    },
  },

  generate: (relations, slots, {html}) =>
    html.tag('ul',
      {[html.onlyIfContent]: true},

      relations.items.map(item =>
        item.slots({
          showArtists: slots.showArtists,
          showDuration: slots.showDuration,
          showDetail: slots.showDetail,
          colorMode: slots.colorMode,
        }))),
};
