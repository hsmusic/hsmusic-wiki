import {getTotalDuration} from '#wiki-data';

export default {
  data: (album) => ({
    date:
      album.date,

    hideDuration:
      album.hideDuration,

    duration:
      (album.hideDuration
        ? null
        : getTotalDuration(album.tracks)),

    tracks:
      (album.hideDuration
        ? null
        : album.tracks.length),
  }),

  generate: (data, {html, language}) =>
    html.tag('p', {class: 'quick-info'},
      {[html.onlyIfContent]: true},

      language.encapsulate('albumGalleryPage.statsLine', workingCapsule => {
        const workingOptions = {};

        if (data.hideDuration && !data.date) {
          return html.blank();
        }

        if (!data.hideDuration) {
          workingOptions.tracks =
            html.tag('b',
              language.countTracks(data.tracks, {unit: true}));

          workingOptions.duration =
            html.tag('b',
              language.formatDuration(data.duration, {unit: true}));
        }

        if (data.date) {
          workingCapsule += '.withDate';
          workingOptions.date =
            html.tag('b',
              language.formatDate(data.date));
        }

        if (data.hideDuration) {
          workingCapsule += '.noDuration';
        }

        return language.$(workingCapsule, workingOptions);
      })),
};
