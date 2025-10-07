export default {
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
      {[html.onlyIfContent]: true},
      {[html.noEdgeWhitespace]: true},
      {[html.joinChildren]: ''},

      slots.attributes,

      slots.options
        .map((option, index) =>
          html.tag('span',
            {[html.onlyIfContent]: true},

            html.resolve(option, {normalize: 'tag'})
              .onlyIfSiblings &&
                {[html.onlyIfSiblings]: true},

            index === slots.initialOptionIndex &&
              {class: 'current'},

            [
              html.metatag('imaginary-sibling'),
              option,
            ]))),
};
