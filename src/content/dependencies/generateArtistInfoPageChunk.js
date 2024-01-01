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

    date: {validate: v => v.isDate},
    dateRangeStart: {validate: v => v.isDate},
    dateRangeEnd: {validate: v => v.isDate},

    duration: {validate: v => v.isDuration},
    durationApproximate: {type: 'boolean'},
  },

  generate(slots, {html, language}) {
    let accentedLink;

    accent: {
      switch (slots.mode) {
        case 'album': {
          accentedLink = slots.albumLink;

          const options = {album: accentedLink};
          const parts = ['artistPage.creditList.album'];

          if (slots.date) {
            parts.push('withDate');
            options.date = language.formatDate(slots.date);
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

          if (
            slots.dateRangeStart &&
            slots.dateRangeEnd &&
            slots.dateRangeStart !== slots.dateRangeEnd
          ) {
            parts.push('withDateRange');
            options.dateRange = language.formatDateRange(slots.dateRangeStart, slots.dateRangeEnd);
          } else if (slots.dateRangeStart || slots.date) {
            parts.push('withDate');
            options.date = language.formatDate(slots.dateRangeStart ?? slots.date);
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
          slots.items)),
    ]);
  },
};
