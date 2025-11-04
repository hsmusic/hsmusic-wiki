import {empty} from '#sugar';

export default {
  slots: {
    mode: {
      validate: v => v.is('flash', 'album'),
    },

    id: {type: 'string'},

    link: {
      type: 'html',
      mutable: false,
    },

    list: {
      type: 'html',
      mutable: false,
    },

    dates: {
      validate: v => v.sparseArrayOf(v.isDate),
    },

    duration: {validate: v => v.isDuration},
    durationApproximate: {type: 'boolean'},
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
    switch (slots.mode) {
      case 'album': {
        const options = {album: slots.link};
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
        const options = {act: slots.link};
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

    return html.tags([
      html.tag('dt',
        slots.id && {id: slots.id},
        accentedLink),

      html.tag('dd', slots.list),
    ]);
  },
};
