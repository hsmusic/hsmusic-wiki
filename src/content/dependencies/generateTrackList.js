export default {
  query: (tracks, contextTrack) => ({
    presentedTracks:
      (contextTrack
        ? tracks.map(track =>
            track.otherReleases.find(({album}) => album === contextTrack.album) ??
            track)
        : tracks),
  }),

  relations: (relation, query, _tracks, _contextTrack) => ({
    items:
      query.presentedTracks
        .map(track => relation('generateTrackListItem', track, [])),
  }),

  slots: {
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
          showArtists: true,
          showDuration: false,
          colorMode: slots.colorMode,
        }))),
};
