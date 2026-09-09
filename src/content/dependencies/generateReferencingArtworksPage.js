export default {
  relations: (relation, artwork) => ({
    layout:
      relation('generatePageLayout'),

    thisArtworkCoverGrid:
      relation('generateCoverGrid', [artwork]),

    referencingArtworksCoverGrid:
      relation('generateCoverGrid',
        artwork.referencedByArtworks.map(({artwork}) => artwork)),
  }),

  data: (artwork) => ({
    color:
      artwork.thing.color,

    count:
      artwork.referencedByArtworks.length,
  }),

  slots: {
    styleTags: {type: 'html', mutable: false},

    title: {type: 'html', mutable: false},

    navLinks: {validate: v => v.isArray},
    navBottomRowContent: {type: 'html', mutable: false},
  },

  generate: (data, relations, slots, {html, language}) =>
    language.encapsulate('referencingArtworksPage', pageCapsule =>
      relations.layout.slots({
        title: slots.title,
        subtitle: language.$(pageCapsule, 'subtitle'),

        color: data.color,
        styleTags: slots.styleTags,

        artworkColumnContent:
          relations.thisArtworkCoverGrid.slots({
            attributes: {class: 'big'},
            allWarnings: [],
          }),

        mainClasses: ['top-index'],
        mainContent: [
          html.tag('p', {class: 'quick-info'},
            language.$(pageCapsule, 'statsLine', {
              artworks:
                language.countArtworks(data.count, {
                  unit: true,
                }),
            })),

          relations.referencingArtworksCoverGrid,
        ],

        navLinkStyle: 'hierarchical',
        navLinks: slots.navLinks,
        navBottomRowContent: slots.navBottomRowContent,
      })),
};
