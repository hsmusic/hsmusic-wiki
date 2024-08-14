export default {
  extraDependencies: ['html', 'language'],

  slots: {
    attributes: {
      type: 'attributes',
      mutable: false,
    },

    links: {
      validate: v => v.looseArrayOf(v.isHTML),
    },
  },

  generate: (slots, {html, language}) =>
    html.tag('span',
      slots.attributes,
      {[html.onlyIfContent]: true},

      language.$('misc.navAccent', {
        [language.onlyIfOptions]: ['links'],

        links:
          html.tags(
            slots.links?.map(link =>
              html.tag('span', {[html.onlyIfContent]: true}, link)),
            {[html.joinChildren]: ' '}),
      })),
};
