export default {
  contentDependencies: [
    'generateTrackInfoPageContent',
    'generateAlbumNavLinks',
    'generateAlbumSidebar',
    'generateAlbumStyleRules',
    'generateColorStyleRules',
    'generatePageLayout',
    'linkAlbum',
    'linkTrack',
  ],

  extraDependencies: ['language'],

  relations(relation, track) {
    return {
      layout: relation('generatePageLayout'),

      albumLink: relation('linkAlbum', track.album),
      trackLink: relation('linkTrack', track),
      albumNavLinks: relation('generateAlbumNavLinks', track.album, track),

      content: relation('generateTrackInfoPageContent', track),
      sidebar: relation('generateAlbumSidebar', track.album, track),
      albumStyleRules: relation('generateAlbumStyleRules', track.album),
      colorStyleRules: relation('generateColorStyleRules', track.color),
    };
  },

  data(track) {
    return {
      name: track.name,

      hasTrackNumbers: track.album.hasTrackNumbers,
      trackNumber: track.album.tracks.indexOf(track) + 1,
    };
  },

  generate(data, relations, {language}) {
    return relations.layout
      .slots({
        title: language.$('trackPage.title', {track: data.name}),
        styleRules: [
          relations.albumStyleRules,
          relations.colorStyleRules,
        ],

        cover: relations.content.cover,
        mainContent: relations.content.main.content,

        navLinkStyle: 'hierarchical',
        navLinks: [
          {auto: 'home'},
          {html: relations.albumLink},
          {
            html:
              (data.hasTrackNumbers
                ? language.$('trackPage.nav.track.withNumber', {
                    number: data.trackNumber,
                    track: relations.trackLink
                      .slot('attributes', {class: 'current'}),
                  })
                : language.$('trackPage.nav.track', {
                    track: relations.trackLink
                      .slot('attributes', {class: 'current'}),
                  })),
          },
        ],

        navContent: '(Chronology links here)',

        navBottomRowContent:
          relations.albumNavLinks.slots({
            showTrackNavigation: true,
            showExtraLinks: false,
          }),

        ...relations.sidebar,
      });
  },
}
