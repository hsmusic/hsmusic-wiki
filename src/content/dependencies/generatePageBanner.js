export default {
  extraDependencies: ['html', 'to'],

  slots: {
    path: {
      validate: v => v.validateArrayItems(v.isString),
    },

    dimensions: {
      validate: v => v.isDimensions,
    },

    alt: {
      type: 'string',
    },
  },

  generate(slots, {html, to}) {
    return (
      html.tag('div', {id: 'banner'},
        html.tag('img', {
          src: to(...slots.path),
          alt: slots.alt,
          width: slots.dimensions?.[0] ?? 1100,
          height: slots.dimensions?.[1] ?? 200,
        })));
  },
};
