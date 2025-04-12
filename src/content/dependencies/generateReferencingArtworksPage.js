export default {
  contentDependencies: [
    'generateCoverArtwork',
    'generateCoverGrid',
    'generatePageLayout',
    'image',
    'linkAnythingMan',
  ],

  extraDependencies: ['html', 'language'],

  relations: (relation, artwork) => ({
    layout:
      relation('generatePageLayout'),

    cover:
      relation('generateCoverArtwork', artwork),

    coverGrid:
      relation('generateCoverGrid'),

    links:
      artwork.referencedByArtworks.map(({artwork}) =>
        relation('linkAnythingMan', artwork.thing)),

    images:
      artwork.referencedByArtworks.map(({artwork}) =>
        relation('image', artwork)),
  }),

  data: (artwork) => ({
    color:
      artwork.thing.color,

    count:
      artwork.referencedByArtworks.length,

    names:
      artwork.referencedByArtworks
        .map(({artwork}) => artwork.thing.name),

    coverArtistNames:
      artwork.referencedByArtworks
        .map(({artwork}) =>
          artwork.artistContribs
            .map(contrib => contrib.artist.name)),
  }),

  slots: {
    styleRules: {type: 'html', mutable: false},

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
        styleRules: slots.styleRules,

        artworkColumnContent:
          relations.cover.slots({
            showArtistDetails: true,
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

          relations.coverGrid.slots({
            links: relations.links,
            images: relations.images,
            names: data.names,

            info:
              data.coverArtistNames.map(names =>
                language.$('misc.coverGrid.details.coverArtists', {
                  artists:
                    language.formatUnitList(names),
                })),
          }),
        ],

        navLinkStyle: 'hierarchical',
        navLinks: slots.navLinks,
        navBottomRowContent: slots.navBottomRowContent,
      })),
};
