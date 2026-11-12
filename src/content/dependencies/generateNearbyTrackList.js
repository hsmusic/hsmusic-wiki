import {stitchArrays} from '#sugar';

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

  data: (query, _tracks, contextTrack) => ({
    presentedTracksMatchContextRelease:
      query.presentedTracks
        .map(track => track.album === contextTrack.album),
  }),

  slots: {
    showNameDetail: {
      type: 'boolean',
      default: true,
    },

    colorMode: {
      validate: v => v.is('none', 'track', 'line'),
      default: 'track',
    },
  },

  generate: (data, relations, slots, {html}) =>
    html.tag('ul',
      {[html.onlyIfContent]: true},

      stitchArrays({
        item: relations.items,
        releasesMatch: data.presentedTracksMatchContextRelease,
      }).map(({item, releasesMatch}) =>
        item.slots({
          showNameDetail:
            (slots.showNameDetail && releasesMatch
              ? 'from within album'
          : slots.showNameDetail
              ? 'from across wiki'
              : false),

          colorMode: slots.colorMode,
        }))),
};
