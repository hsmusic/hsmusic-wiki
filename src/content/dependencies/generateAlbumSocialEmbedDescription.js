import {accumulateSum} from '#sugar';

export default {
  extraDependencies: ['language'],

  data: (album) => ({
    duration:
      accumulateSum(album.tracks, track => track.duration),

    tracks:
      album.tracks.length,

    date:
      album.date,
  }),

  generate: (data, {language}) =>
    language.encapsulate('albumPage.socialEmbed.body', workingCapsule => {
      const workingOptions = {};

      if (data.duration > 0) {
        workingCapsule += '.withDuration';
        workingOptions.duration =
          language.formatDuration(data.duration);
      }

      if (data.tracks > 0) {
        workingCapsule += '.withTracks';
        workingOptions.tracks =
          language.countTracks(data.tracks, {unit: true});
      }

      if (data.date) {
        workingCapsule += '.withReleaseDate';
        workingOptions.date =
          language.formatDate(data.date);
      }

      return language.$(workingCapsule, workingOptions);
    }),
};
