export default {
  slots: {
    content: {
      type: 'html',
      mutable: false,
    },

    attributes: {
      type: 'attributes',
      mutable: false,
    },

    alwaysVisible: {
      type: 'boolean',
      default: false,
    },
  },

  generate: (slots, {html}) =>
    html.tag('nav', {id: 'secondary-nav'},
      {[html.onlyIfContent]: true},
      slots.attributes,

      slots.alwaysVisible &&
        {class: 'always-visible'},

      slots.content),
};
