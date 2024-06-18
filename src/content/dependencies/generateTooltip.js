export default {
  extraDependencies: ['html'],

  slots: {
    attributes: {
      type: 'attributes',
      mutable: false,
    },

    contentAttributes: {
      type: 'attributes',
      mutable: false,
    },

    content: {
      type: 'html',
      mutable: false,
    },
  },

  generate: (slots, {html}) =>
    html.tag('span', {class: 'tooltip'},
      {[html.noEdgeWhitespace]: true},
      {[html.onlyIfContent]: true},
      slots.attributes,

      html.tag('span', {class: 'tooltip-content'},
        {[html.noEdgeWhitespace]: true},
        {[html.onlyIfContent]: true},
        slots.contentAttributes,

        slots.content)),
};
