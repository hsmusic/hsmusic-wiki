export default {
  extraDependencies: ['html'],

  slots: {
    content: {
      type: 'html',
      mutable: false,
    },

    attributes: {
      type: 'attributes',
      mutable: false,
    },
  },

  generate: (slots, {html}) =>
    html.tag('div', {class: 'sidebar'},
      slots.attributes,
      slots.content),
};
