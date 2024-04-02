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
      html.tag('ul',
        (html.isBlank(slots.items)
          ? html.tag('li',
              language.$('releaseInfo.additionalFiles.entry.noFilesAvailable'))
          : slots.items));

    const details =
      html.tag('details',
        html.isBlank(slots.items) &&
          {open: true},

        [summary, content]);

    return html.tag('li', details);
  },
};
