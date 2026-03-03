export default {
  slots: {
    filter: {
      validate: v => v.is('all', 'direct', 'indirect'),
    },

    count: {type: 'number'},
  },

  generate: (slots, {html, language}) =>
    language.encapsulate('artTagGalleryPage', pageCapsule =>
      html.tag('span',
        {id: `showing-${slots.filter}-line`},

        language.$(pageCapsule, 'showingLine', {
          showing:
            html.tag('a', {href: '#'},
              language.$(pageCapsule, 'showingLine', slots.filter)),
        }))),
};
