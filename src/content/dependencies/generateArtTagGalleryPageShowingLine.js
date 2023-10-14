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
        {id: `showing-${slots.showing}-line`},

        language.$(pageCapsule, 'showingLine', {
          showing:
            html.tag('a', {href: '#'},
              language.$(pageCapsule, 'showingLine', slots.showing)),
        }))),
};
