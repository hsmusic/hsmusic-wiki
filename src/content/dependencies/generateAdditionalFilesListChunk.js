export default {
  extraDependencies: ['html', 'language'],

  slots: {
    title: {
      type: 'html',
      mutable: false,
    },

    description: {
      type: 'html',
      mutable: false,
    },

    items: {
      validate: v => v.looseArrayOf(v.isHTML),
    },
  },

  generate(slots, {html, language}) {
    const titleParts = ['releaseInfo.additionalFiles.entry'];
    const titleOptions = {title: slots.title};

    if (!html.isBlank(slots.description)) {
      titleParts.push('withDescription');
      titleOptions.description = slots.description;
    }

    const summary =
      html.tag('summary',
        html.tag('span',
          language.$(...titleParts, titleOptions)));

    const content =
      html.tag('ul', slots.items);

    const details =
      html.tag('details',
        slots.items.length <= 5 &&
          {open: true},

        [summary, content]);

    return html.tag('li', details);
  },
};
