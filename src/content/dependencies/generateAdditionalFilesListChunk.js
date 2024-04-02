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

    const dt =
      html.tag('dt',
        language.$(...titleParts, titleOptions));

    const dd =
      html.tag('dd',
        html.tag('ul', slots.items));

    return html.tags([dt, dd]);
  },
};
