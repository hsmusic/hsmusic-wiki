export default {
  contentDependencies: [
    'generateAlbumInfoPageContent',
    'generateAlbumNavLinks',
    'generateAlbumSidebar',
    'generateAlbumSocialEmbed',
    'generateAlbumStyleRules',
    'generateColorStyleRules',
    'generatePageLayout',
  ],

  extraDependencies: ['language'],

  relations(relation, album) {
    return {
      layout: relation('generatePageLayout'),
      albumNavLinks: relation('generateAlbumNavLinks', album, null),

      content: relation('generateAlbumInfoPageContent', album),
      sidebar: relation('generateAlbumSidebar', album, null),
      socialEmbed: relation('generateAlbumSocialEmbed', album),
      albumStyleRules: relation('generateAlbumStyleRules', album),
      colorStyleRules: relation('generateColorStyleRules', album.color),
    };
  },

  data(album) {
    return {
      name: album.name,
    };
  },

  generate(data, relations, {language}) {
    return relations.layout
      .slots({
        title: language.$('albumPage.title', {album: data.name}),
        headingMode: 'sticky',

        styleRules: [
          relations.albumStyleRules,
          relations.colorStyleRules,
        ],

        cover: relations.content.cover,
        mainContent: relations.content.main.content,

        navLinkStyle: 'hierarchical',
        navLinks: [
          {auto: 'home'},
          {
            auto: 'current',
            accent:
              relations.albumNavLinks.slots({
                showTrackNavigation: true,
                showExtraLinks: true,
              }),
          },
        ],
        navContent: '(Chronology links here)',

        ...relations.sidebar,

        // socialEmbed: relations.socialEmbed,
      });
  },
};
