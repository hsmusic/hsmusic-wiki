import {stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateCoverGrid',
    'generatePageLayout',
    'image',
    'linkAlbum',
    'linkTrack',
  ],

  extraDependencies: ['html', 'language'],

  relations: (relation, referencingArtworks) => ({
    layout:
      relation('generatePageLayout'),

    coverGrid:
      relation('generateCoverGrid'),

    links:
      referencingArtworks.map(({thing}) =>
        (thing.album
          ? relation('linkTrack', thing)
          : relation('linkAlbum', thing))),

    images:
      referencingArtworks.map(({thing}) =>
        relation('image', thing.artTags)),
  }),

  data: (referencingArtworks) => ({
    count:
      referencingArtworks.length,

    names:
      referencingArtworks
        .map(({thing}) => thing.name),

    paths:
      referencingArtworks
        .map(({thing}) =>
          (thing.album
            ? ['media.trackCover', thing.album.directory, thing.directory, thing.coverArtFileExtension]
            : ['media.albumCover', thing.directory, thing.coverArtFileExtension])),

    dimensions:
      referencingArtworks
        .map(({thing}) => thing.coverArtDimensions),

    coverArtistNames:
      referencingArtworks
        .map(({thing}) =>
          thing.coverArtistContribs
            .map(contrib => contrib.artist.name)),
  }),

  slots: {
    color: {validate: v => v.isColor},

    styleRules: {type: 'html', mutable: false},

    title: {type: 'html', mutable: false},
    cover: {type: 'html', mutable: true},

    navLinks: {validate: v => v.isArray},
    navBottomRowContent: {type: 'html', mutable: false},
  },

  generate: (data, relations, slots, {html, language}) =>
    language.encapsulate('referencingArtworksPage', pageCapsule =>
      relations.layout.slots({
        title: slots.title,
        subtitle: language.$(pageCapsule, 'subtitle'),

        color: slots.color,
        styleRules: slots.styleRules,

        coverColumnContent:
          slots.cover.slot('details', 'artists'),

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
            names: data.names,

            images:
              stitchArrays({
                image: relations.images,
                path: data.paths,
                dimensions: data.dimensions,
              }).map(({image, path, dimensions}) =>
                  image.slots({
                    path,
                    dimensions,
                  })),

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
