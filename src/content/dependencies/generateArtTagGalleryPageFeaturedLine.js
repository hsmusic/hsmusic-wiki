export default {
  extraDependencies: ['html', 'language'],

  slots: {
    showing: {
      validate: v => v.is('all', 'direct', 'indirect'),
    },

    count: {type: 'number'},
  },

  generate: (slots, {html, language}) =>
    language.encapsulate('artTagGalleryPage', pageCapsule =>
      html.tag('p', {class: 'quick-info'},
        {id: `featured-${slots.showing}-line`},

        language.$(pageCapsule, 'featuredLine', slots.showing, {
          coverArts:
            language.countArtworks(slots.count, {
              unit: true,
            }),
        }))),
};
