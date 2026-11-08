export default {
  slots: {
    filter: {
      validate: v => v.is('all', 'direct', 'indirect'),
    },

    count: {type: 'number'},
  },

  generate: (slots, {html, language}) =>
    language.encapsulate('artTagGalleryPage.artworks.showingLine', capsule =>
      html.tag('span',
        {id: `showing-${slots.filter}-line`},

        language.$(capsule, {
          showing:
            html.tag('a', {href: '#'},
              language.$(capsule, slots.filter)),
        }))),
};
