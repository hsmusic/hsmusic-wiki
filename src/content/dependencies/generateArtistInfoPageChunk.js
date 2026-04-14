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

    // Container and items, respectively.
    date: {validate: v => v.isDate},
    dates: {validate: v => v.sparseArrayOf(v.isDate)},

    duration: {validate: v => v.isDuration},
    durationApproximate: {type: 'boolean'},
  },

  generate(slots, {html, language}) {
    let earliestItemDate = null;
    let latestItemDate = null;
    let onlyItemDate = null;

    if (!empty(slots.dates)) {
      earliestItemDate = slots.dates[0];
      latestItemDate = slots.dates[1];

      for (const date of slots.dates.slice(1)) {
        if (date < earliestItemDate) earliestItemDate = date;
        if (date > latestItemDate) latestItemDate = date;
      }

      if (+earliestItemDate === +latestItemDate) {
        onlyItemDate = earliestItemDate;
      }
    }

    let accentedLink;
    switch (slots.mode) {
      case 'album': {
        const options = {album: slots.link};
        const parts = ['artistPage.creditList.album'];

        if (slots.date) {
          parts.push('withDate');
          options.date = language.formatDate(slots.date);
        } else if (onlyItemDate) {
          parts.push('withDate');
          options.date = language.formatDate(onlyItemDate);
        } else if (earliestItemDate && latestItemDate) {
          parts.push('withDateRange');
          options.dateRange =
            language.formatDateRange(earliestItemDate, latestItemDate);
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

        if (onlyItemDate) {
          parts.push('withDate');
          options.date = language.formatDate(onlyItemDate);
        } else if (earliestItemDate && latestItemDate) {
          parts.push('withDateRange');
          options.dateRange =
            language.formatDateRange(earliestItemDate, latestItemDate);
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
