import {accumulateSum} from '../../util/sugar.js';

export default {
  extraDependencies: ['language'],

  data(album) {
    const data = {};

    const duration = accumulateSum(album.tracks, track => track.duration);

    data.hasDuration = duration > 0;
    data.hasTracks = album.tracks.length > 0;
    data.hasDate = !!album.date;
    data.hasAny = (data.hasDuration || data.hasTracks || data.hasDuration);

    if (!data.hasAny)
      return data;

    if (data.hasDuration)
      data.duration = duration;

    if (data.hasTracks)
      data.tracks = album.tracks.length;

    if (data.hasDate)
      data.date = album.date;

    return data;
  },

  generate(data, {language}) {
    return language.formatString(
      'albumPage.socialEmbed.body' + [
        data.hasDuration && '.withDuration',
        data.hasTracks && '.withTracks',
        data.hasDate && '.withReleaseDate',
      ].filter(Boolean).join(''),

      Object.fromEntries([
        data.hasDuration &&
          ['duration', language.formatDuration(data.duration)],
        data.hasTracks &&
          ['tracks', language.countTracks(data.tracks, {unit: true})],
        data.hasDate &&
          ['date', language.formatDate(data.date)],
      ].filter(Boolean)));
  },
};
