export default {
  extraDependencies: ['html', 'language'],

  slots: {
    albumLink: {type: 'html'},

    date: {validate: v => v.isDate},
    duration: {validate: v => v.isDuration},
    durationApproximate: {type: 'boolean'},

    items: {type: 'html'},
  },

  generate(slots, {html, language}) {
    let accentedLink = slots.albumLink;

    accent: {
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

      accentedLink = language.formatString(parts.join('.'), options);
    }

    return html.tags([
      html.tag('dt', accentedLink),
      html.tag('dd',
        html.tag('ul',
          slots.items)),
    ]);
  },
};
