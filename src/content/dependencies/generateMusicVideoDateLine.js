import {sameDayAs} from '#wiki-data';

export default {
  data: (musicVideo, thing) => ({
    date:
      musicVideo.date,

    dateIsSpecified:
      musicVideo.dateIsSpecified,

    sameDayAs:
      (musicVideo.dateIsSpecified
        ? sameDayAs(musicVideo.date, thing)
        : null),
  }),

  generate: (data, {language}) =>
    language.encapsulate('misc.musicVideo.date', capsule => [
      data.sameDayAs === 'album' &&
        language.$(capsule, 'sameDayAsAlbum'),

      data.sameDayAs === 'single' &&
        language.$(capsule, 'sameDayAsSingle'),

      data.sameDayAs === 'track' &&
        language.$(capsule, 'sameDayAsTrack'),

      data.sameDayAs === null &&
      data.dateIsSpecified &&
        language.$(capsule, {
          date:
            language.formatDate(data.date),
        }),
    ]),
};
