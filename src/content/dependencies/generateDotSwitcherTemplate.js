export default {
  extraDependencies: ['html'],

  slots: {
    attributes: {
      type: 'attributes',
      mutable: false,
    },

    options: {
      validate: v => v.strictArrayOf(v.isHTML),
    },

    initialOptionIndex: {type: 'number'},
  },

  generate: (slots, {html}) =>
    html.tag('span', {class: 'dot-switcher'},
      {[html.noEdgeWhitespace]: true},
      {[html.joinChildren]: ''},

      slots.attributes,

      slots.options
        .map((option, index) =>
          html.tag('span',
            {[html.onlyIfContent]: true},

            index === slots.initialOptionIndex &&
              {class: 'current'},

            option))),
};
