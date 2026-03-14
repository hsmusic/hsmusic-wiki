export default {
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

    attributes: {
      type: 'attributes',
      mutable: false,
    },
  },

  generate: (slots, {html, to}) =>
    html.tag('div', {id: 'banner'},
      slots.attributes,

      html.tag('img',
        {src: to(...slots.path)},

        (slots.dimensions
          ? {width: slots.dimensions[0]}
          : {width: 1100}),

        (slots.dimensions
          ? {height: slots.dimensions[1]}
          : {height: 200}),

        slots.alt &&
          {alt: slots.alt})),
};
