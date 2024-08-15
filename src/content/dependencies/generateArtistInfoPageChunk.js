import {empty} from '#sugar';

export default {
  extraDependencies: ['html', 'language'],

  slots: {
    mode: {
      validate: v => v.is('flash', 'album'),
    },

    albumLink: {
      type: 'html',
      mutable: false,
    },

    flashActLink: {
      type: 'html',
      mutable: false,
    },

    items: {
      type: 'html',
      mutable: false,
    },

    dates: {
      validate: v => v.sparseArrayOf(v.isDate),
    },

    duration: {validate: v => v.isDuration},
    durationApproximate: {type: 'boolean'},

    trimAnnotations: {
      type: 'boolean',
      default: false,
    },
  },

  generate(slots, {html, language}) {
    let earliestDate = null;
    let latestDate = null;
    let onlyDate = null;

    if (!empty(slots.dates)) {
      earliestDate =
        slots.dates
          .reduce((a, b) => a <= b ? a : b);

      latestDate =
        slots.dates
          .reduce((a, b) => a <= b ? b : a);

      if (+earliestDate === +latestDate) {
        onlyDate = earliestDate;
      }
    }

    let accentedLink;

    accent: {
      switch (slots.mode) {
        case 'album': {
          accentedLink = slots.albumLink;

          const options = {album: accentedLink};
          const parts = ['artistPage.creditList.album'];

          if (onlyDate) {
            parts.push('withDate');
            options.date = language.formatDate(onlyDate);
          }

          if (slots.duration) {
            parts.push('withDuration');
            options.duration =
              language.formatDuration(slots.duration, {
                approximate: slots.durationApproximate,
              });
          }

          accentedLink = language.formatString(...parts, options);
          break;
        }

        case 'flash': {
          accentedLink = slots.flashActLink;

          const options = {act: accentedLink};
          const parts = ['artistPage.creditList.flashAct'];

          if (onlyDate) {
            parts.push('withDate');
            options.date = language.formatDate(onlyDate);
          } else if (earliestDate && latestDate) {
            parts.push('withDateRange');
            options.dateRange =
              language.formatDateRange(earliestDate, latestDate);
          }

          accentedLink = language.formatString(...parts, options);
          break;
        }
      }
    }

    return html.tags([
      html.tag('dt', accentedLink),
      html.tag('dd',
        html.tag('ul',
          slots.items
            .map(item => item.slots({
              trimAnnotation: slots.trimAnnotations,
            })))),
    ]);
  },
};
