export default {
  contentDependencies: [
    'generateTrackInfoPageContent',
    'generateAlbumSidebar',
    'generateAlbumStyleRules',
    'generateColorStyleRules',
    'generatePageLayout',
  ],

  extraDependencies: ['language'],

  relations(relation, track) {
    return {
      layout: relation('generatePageLayout'),

      content: relation('generateTrackInfoPageContent', track),
      sidebar: relation('generateAlbumSidebar', track.album, track),
      albumStyleRules: relation('generateAlbumStyleRules', track.album),
      colorStyleRules: relation('generateColorStyleRules', track.color),
    };
  },

  data(track) {
    return {
      name: track.name,
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

        ...relations.sidebar,
      });
  },
}
