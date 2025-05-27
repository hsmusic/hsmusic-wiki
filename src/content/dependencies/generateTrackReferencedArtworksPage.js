export default {
  contentDependencies: [
    'generateAlbumStyleTags',
    'generateBackToTrackLink',
    'generateReferencedArtworksPage',
    'generateTrackNavLinks',
  ],

  extraDependencies: ['html', 'language'],

  relations: (relation, track) => ({
    page:
      relation('generateReferencedArtworksPage', track.trackArtworks[0]),

    albumStyleTags:
      relation('generateAlbumStyleTags', track.album, track),

    navLinks:
      relation('generateTrackNavLinks', track),

    backToTrackLink:
      relation('generateBackToTrackLink', track),
  }),

  data: (track) => ({
    name:
      track.name,
  }),

  generate: (data, relations, {html, language}) =>
    relations.page.slots({
      title:
        language.$('trackPage.title', {
          track:
            data.name,
        }),

      styleTags: relations.albumStyleTags,

      navLinks:
        html.resolve(
          relations.navLinks
            .slot('currentExtra', 'referenced-art')),

      navBottomRowContent: relations.backToTrackLink,
    }),
};
