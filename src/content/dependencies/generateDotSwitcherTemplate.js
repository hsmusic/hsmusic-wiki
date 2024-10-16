export default {
  extraDependencies: ['html', 'language'],

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

  generate: (slots, {html, language}) =>
    html.tag('span', {class: 'dot-switcher'},
      slots.attributes,

      language.formatListWithoutSeparator(
        slots.options
          .map((option, index) =>
            html.tag('span',
              index === slots.initialOptionIndex &&
                {class: 'current'},

              option)))),
};
