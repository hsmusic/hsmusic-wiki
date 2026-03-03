export default {
  slots: {
    string: {validate: v => v.is('simple', 'altogether', 'direct', 'indirect')},
    filter: {validate: v => v.is('all', 'direct', 'indirect')},
    count: {type: 'number'},
  },

  generate: (slots, {html, language}) =>
    language.encapsulate('artTagGalleryPage', pageCapsule =>
      html.tag('span',
        {id: `featured-${slots.filter}-line`},

        language.$(pageCapsule, 'featuredLine', slots.string, {
          coverArts:
            language.countArtworks(slots.count, {
              unit: true,
            }),
        }))),
};
