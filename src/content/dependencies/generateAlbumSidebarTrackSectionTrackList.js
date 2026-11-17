import {empty, stitchArrays} from '#sugar';

export default {
  relations: (relation, section, _currentTrack) => ({
    trackList:
      relation('generateTrackSectionTrackList', section),
  }),

  data: (section, currentTrack) => ({
    trackDirectories:
      section.tracks.map(track => track.directory),

    tracksAreCurrentTrack:
      section.tracks.map(track => track === currentTrack),

    tracksAreMissingCommentary:
      section.tracks.map(track => empty(track.commentary)),

    trackColorsDifferFromCurrentCustomTrackColor:
      (currentTrack.color !== currentTrack.album.color
        ? section.tracks.map(track => track.color !== currentTrack.color)
        : section.tracks.map(() => false)),
  }),

  slots: {
    mode: {
      validate: v => v.is('info', 'commentary'),
      default: 'info',
    },
  },

  generate: (data, relations, slots) =>
    relations.trackList.slots({
      showArtists: false,

      colorizeItems:
        data.trackColorsDifferFromCurrentCustomTrackColor,

      itemAttributes:
        stitchArrays({
          isCurrentTrack: data.tracksAreCurrentTrack,
          missingCommentary: data.tracksAreMissingCommentary,
        }).map(({isCurrentTrack, missingCommentary}) => [
            isCurrentTrack &&
              {class: 'current'},

            slots.mode === 'commentary' &&
            missingCommentary &&
              {class: 'no-commentary'},
          ]),

      linkSlots:
        stitchArrays({
          directory: data.trackDirectories,
          missingCommentary: data.tracksAreMissingCommentary,
        }).map(({directory, missingCommentary}) => {
            if (slots.mode === 'commentary') {
              if (missingCommentary) {
                return {linkless: true};
              } else {
                return {anchor: true, hash: directory};
              }
            }

            return {};
          }),
    }),
};
