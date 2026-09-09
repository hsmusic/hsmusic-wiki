export default {
  relations: (relation, artwork) => ({
    layout:
      relation('generatePageLayout'),

    thisArtworkCoverGrid:
      relation('generateCoverGrid', [artwork]),

    referencedArtworksCoverGrid:
      relation('generateCoverGrid',
        artwork.referencedArtworks.map(({artwork}) => artwork)),
  }),

  data: (artwork) => ({
    color:
      artwork.thing.color,

    count:
      artwork.referencedArtworks.length,
  }),

  slots: {
    styleTags: {type: 'html', mutable: false},

    title: {type: 'html', mutable: false},

    navLinks: {validate: v => v.isArray},
    navBottomRowContent: {type: 'html', mutable: false},
  },

  generate: (data, relations, slots, {html, language}) =>
    language.encapsulate('referencedArtworksPage', pageCapsule =>
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

          relations.referencedArtworksCoverGrid,
        ],

        navLinkStyle: 'hierarchical',
        navLinks: slots.navLinks,
        navBottomRowContent: slots.navBottomRowContent,
      })),
};
