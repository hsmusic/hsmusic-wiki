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

    collapsible: {
      type: 'boolean',
      default: true,
    },
  },

  generate: (slots, {html}) =>
    html.tag('div', {class: 'sidebar'},
      {[html.onlyIfContent]: true},

      slots.collapsible &&
        {class: 'collapsible'},

      slots.attributes,
      slots.content),
};
