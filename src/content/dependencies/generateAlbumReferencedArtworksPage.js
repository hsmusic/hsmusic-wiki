export default {
  relations: (relation, album) => ({
    page:
      relation('generateReferencedArtworksPage', album.coverArtworks[0]),

    albumStyleTags:
      relation('generateAlbumStyleTags', album, null),

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

      styleTags: relations.albumStyleTags,

      navLinks: [
        {auto: 'home'},

        {
          html:
            relations.albumLink
              .slot('attributes', {class: 'current'}),

          accent:
            html.tag('a', {href: ''},
              {class: 'current'},

              language.$('referencedArtworksPage.subtitle')),
        },
      ],

      navBottomRowContent: relations.backToAlbumLink,
    }),
};
