export default {
  contentDependencies: [
    'generateAlbumStyleRules',
    'generateBackToTrackLink',
    'generateReferencingArtworksPage',
    'generateTrackNavLinks',
  ],

  extraDependencies: ['html', 'language'],

  relations: (relation, track) => ({
    page:
      relation('generateReferencingArtworksPage', track.trackArtworks[0]),

    albumStyleRules:
      relation('generateAlbumStyleRules', track.album, track),

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

      styleRules: [relations.albumStyleRules],

      navLinks:
        html.resolve(
          relations.navLinks
            .slot('currentExtra', 'referencing-art')),

      navBottomRowContent: relations.backToTrackLink,
    }),
};
