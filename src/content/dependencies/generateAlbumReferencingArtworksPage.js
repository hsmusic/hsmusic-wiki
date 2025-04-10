export default {
  contentDependencies: [
    'generateAlbumStyleRules',
    'generateBackToAlbumLink',
    'generateReferencingArtworksPage',
    'linkAlbum',
  ],

  extraDependencies: ['html', 'language'],

  relations: (relation, album) => ({
    page:
      relation('generateReferencingArtworksPage', album.coverArtworks[0]),

    albumStyleRules:
      relation('generateAlbumStyleRules', album, null),

    albumLink:
      relation('linkAlbum', album),

    backToAlbumLink:
      relation('generateBackToAlbumLink', album),
  }),

  data: (album) => ({
    name:
      album.name,
  }),

  generate: (data, relations, {html, language}) =>
    relations.page.slots({
      title:
        language.$('albumPage.title', {
          album:
            data.name,
        }),

      styleRules: [relations.albumStyleRules],

      navLinks: [
        {auto: 'home'},

        {
          html:
            relations.albumLink
              .slot('attributes', {class: 'current'}),

          accent:
            html.tag('a', {href: ''},
              {class: 'current'},

              language.$('referencingArtworksPage.subtitle')),
        },
      ],

      navBottomRowContent: relations.backToAlbumLink,
    }),
};
