import {accumulateSum} from '#sugar';

export default {
  data: (album) => ({
    duration:
      accumulateSum(album.tracks, track => track.duration),

    tracks:
      album.tracks.length,

    date:
      album.date,

    dateStyle:
      album.dateStyle,
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

      if (data.dateStyle === 'released') {
        workingCapsule += '.withDateReleased';
        workingOptions.date =
          language.formatDate(data.date);
      } else if (data.dateStyle === 'posted') {
        workingCapsule += '.withDatePosted';
        workingOptions.date =
          language.formatDate(data.date);
      }

      return language.$(workingCapsule, workingOptions);
    }),
};
